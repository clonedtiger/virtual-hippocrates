// frontend/src/components/Questionnaire.js
import React, { useState, useEffect, useCallback } from 'react';
import Question from './Question';
import './Questionnaire.css'; // For basic styling

// submitQuestionnaireData function (assuming it's defined correctly as per previous versions)
const submitQuestionnaireData = async (qKey, qVersion, answers, patientId = null) => {
  try {
    const payloadBody = { 
      questionnaireKey: qKey, 
      questionnaireVersion: qVersion, 
      answers 
    };
    if (patientId) {
      payloadBody.patientId = patientId;
    }

    const response = await fetch('http://localhost:5001/api/submit-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadBody),
    });
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: response.statusText };
      }
      console.error('Backend submission failed:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error submitting questionnaire data:', error);
    throw error; 
  }
};


function Questionnaire({ questionnaireKey, questionnaireVersion = null, patientId, onQuestionnaireSubmitSuccess }) {
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const loadQuestionnaire = async () => {
      if (!questionnaireKey) {
        setError("No questionnaire key provided for loading.");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      let apiUrl = `/api/questionnaire/${questionnaireKey}`; 
      if (questionnaireVersion) {
        apiUrl += `/${questionnaireVersion}`;
      }

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          let errorData = { error: `Backend request failed: ${response.status} ${response.statusText}` };
          try {
            const responseText = await response.text(); // Get text first for potential HTML error
            errorData = JSON.parse(responseText); // Try to parse
          } catch (parseError) {
             // If parsing fails, errorData remains the status text
             console.warn("Could not parse error response as JSON from backend fetch.", parseError)
          }
          throw new Error(errorData.error || `Failed to fetch questionnaire`);
        }

        const data = await response.json(); 

        if (data && data.questions && data.questions.length > 0) {
          setCurrentQuestionnaire(data);
          setCurrentQuestion(data.questions[0]);
          setAnswers({});
          setHistory([]);
          setIsComplete(false);
        } else {
          setError(`Questionnaire "${questionnaireKey}" (v${questionnaireVersion || 'latest'}) not found, is empty, or data structure is incorrect.`);
        }
      } catch (err) {
        setError(`Failed to load questionnaire: ${err.message}`);
        console.error("Frontend: Full error in loadQuestionnaire catch block:", err); 
      } finally {
        setIsLoading(false);
      }
    };

    if (questionnaireKey) {
      loadQuestionnaire();
    } else {
      setError("No questionnaire selected to load.");
      setCurrentQuestionnaire(null);
      setCurrentQuestion(null);
      setAnswers({});
      setHistory([]);
      setIsComplete(false);
      setIsLoading(false);
    }
  }, [questionnaireKey, questionnaireVersion]);

  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: value,
    }));
  }, []);

  const findNextQuestion = useCallback((currentQ, currentAnswer) => {
    if (!currentQuestionnaire || !currentQuestionnaire.questions) return null;
    if (!currentQ) return null;
    
    if (currentQ.branchingLogic) {
      for (const branch of currentQ.branchingLogic) {
        if (branch.condition && branch.condition.type === "equals" && currentAnswer === branch.condition.answerValue) {
          return currentQuestionnaire.questions.find(q => q.id === branch.nextQuestionId) || null;
        }
      }
    }

    if (currentQ.defaultNextQuestionId) {
      const nextQuestionObject = currentQuestionnaire.questions.find(
        q => q.id === currentQ.defaultNextQuestionId
      );
      if (!nextQuestionObject && 
          (currentQ.defaultNextQuestionId === "END_OF_INITIAL_MEDICAL" || 
           currentQ.defaultNextQuestionId === "journey_medical_start")) {
        return null; 
      }
      return nextQuestionObject || null;
    }
    return null;
  }, [currentQuestionnaire]);

  const handleNext = useCallback(() => {
    if (!currentQuestion) return;

    if (currentQuestion.isRequired && (answers[currentQuestion.id] === undefined || answers[currentQuestion.id] === '')) {
      alert(`Please answer the question: "${currentQuestion.text}"`);
      return;
    }
    
    setHistory(prevHistory => [...prevHistory, { questionId: currentQuestion.id, answer: answers[currentQuestion.id] }]);
    
    const nextQ = findNextQuestion(currentQuestion, answers[currentQuestion.id]);
    
    setCurrentQuestion(nextQ);

    if (!nextQ) {
      if (currentQuestion.defaultNextQuestionId === "END_OF_INITIAL_MEDICAL" || 
          currentQuestion.defaultNextQuestionId === "journey_medical_start" ||
          !currentQuestion.defaultNextQuestionId 
         ) {
        setIsComplete(true);
      } else if (currentQuestion.defaultNextQuestionId && !nextQ) {
        console.warn(`handleNext: Next question ID "${currentQuestion.defaultNextQuestionId}" not found in questionnaire. Marking as complete.`);
        setIsComplete(true);
      }
    } else {
      if (isComplete) { 
          setIsComplete(false);
      }
    }
  }, [currentQuestion, answers, findNextQuestion, setHistory, setCurrentQuestion, setIsComplete, isComplete]);

  const handleBack = useCallback(() => {
    if (history.length === 0) return;
    const newHistory = history.slice(0, -1);
    const lastState = history[history.length - 1];
    
    const previousQuestion = currentQuestionnaire.questions.find(q => q.id === lastState.questionId);
    
    setCurrentQuestion(previousQuestion);
    setHistory(newHistory);
    setIsComplete(false);
  }, [history, setHistory, setCurrentQuestion, setIsComplete, currentQuestionnaire]);

  const handleSubmitAll = useCallback(async () => {
    if (!currentQuestionnaire || !currentQuestionnaire.questionnaireId || !currentQuestionnaire.version) {
        alert("Error: Questionnaire data (ID or version) is not loaded properly. Cannot submit.");
        console.error("handleSubmitAll called without complete currentQuestionnaire data:", currentQuestionnaire);
        return;
    }
    try {
        const result = await submitQuestionnaireData(
            currentQuestionnaire.questionnaireId,
            currentQuestionnaire.version,
            answers,
            patientId // Pass patientId if available (for non-registration questionnaires)
        );
        
        if (onQuestionnaireSubmitSuccess) {
          onQuestionnaireSubmitSuccess(result);
        } else {
          alert(result.message || "Submission successful!"); 
        }
    } catch (submissionError) {
        alert(`Submission failed: ${submissionError.message}`);
        console.error("Detailed submission error in handleSubmitAll:", submissionError);
    }
  }, [currentQuestionnaire, answers, patientId, onQuestionnaireSubmitSuccess]);


  if (isLoading) return <div role="status" aria-live="polite">Loading questionnaire...</div>;
  if (error) return <div role="alert" className="questionnaire-error">Error: {error}</div>;
  if (!currentQuestionnaire) return <div role="status" aria-live="polite">No questionnaire data loaded.</div>;

  if (isComplete) {
    return (
      <div className="questionnaire-container" aria-labelledby="questionnaire-title">
        <h2 id="questionnaire-title">{currentQuestionnaire.title} - Complete</h2>
        <p>Thank you for completing the questionnaire.</p>
        <h3>Summary of Answers:</h3>
        <ul>
          {Object.entries(answers).map(([qid, ans]) => {
            const questionDetails = currentQuestionnaire.questions.find(q => q.id === qid);
            return (
              <li key={qid}>
                <strong>{questionDetails ? questionDetails.text : qid}:</strong> {String(ans)}
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={handleSubmitAll}>Submit All Answers</button>
        {history.length > 0 && <button type="button" onClick={handleBack} className="back-button">Go Back to Last Question</button>}
      </div>
    );
  }

  if (!currentQuestion) {
    return <div role="status" aria-live="polite">Questionnaire ended or error in question sequence.</div>;
  }

  return (
    <div className="questionnaire-container" aria-labelledby="questionnaire-title">
      <h2 id="questionnaire-title">{currentQuestionnaire.title}</h2>
      <Question
        question={currentQuestion}
        value={answers[currentQuestion.id] || ''}
        onAnswerChange={handleAnswerChange}
        onQuestionShouldAdvance={handleNext} // Pass handleNext as the callback
      />
      <div className="navigation-buttons">
        {history.length > 0 && <button type="button" onClick={handleBack} className="back-button">Back</button>}
        <button type="button" onClick={handleNext} className="next-button">
          {findNextQuestion(currentQuestion, answers[currentQuestion.id]) ? 'Next' : 'Finish'}
        </button>
      </div>
    </div>
  );
}

export default Questionnaire;
