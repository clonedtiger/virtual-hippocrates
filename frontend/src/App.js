// frontend/src/App.js
import React, { useState } from 'react';
import Questionnaire from './components/Questionnaire';
import BodySelectorPage from './components/BodySelectorPage'; // New component
import './App.css'; // Assuming you have a basic App.css

function App() {
  const [currentView, setCurrentView] = useState('registration'); // 'registration', 'bodySelector', 'questionnaire'
  const [currentPatientInfo, setCurrentPatientInfo] = useState(null); // Will store { id, name, gender, registrationAnswers }
  const [activeQuestionnaireProps, setActiveQuestionnaireProps] = useState({
    key: 'PATIENT_REG_001', // Start with the registration questionnaire key
    version: null,          // Fetch latest version by default (backend handles this if version is null)
    patientId: null         // No patientId needed for initial registration
  });

  // This function is called when any questionnaire submission is successful
  const handleQuestionnaireSubmitSuccess = (submissionResult, submittedQuestionnaireKey) => {
    if (!submissionResult) {
      console.error("Submission result is undefined in handleQuestionnaireSubmitSuccess");
      alert("An unexpected error occurred after submission. Please try again.");
      return;
    }

    if (submittedQuestionnaireKey === 'PATIENT_REG_001') {
      // This was the registration questionnaire
      if (submissionResult.patientId && submissionResult.answers) {
        const name = submissionResult.answers.reg_name || "Patient"; // Extract name from answers
        const gender = submissionResult.answers.reg_gender || "neutral"; // Extract gender

        setCurrentPatientInfo({
          id: submissionResult.patientId,
          name: name,
          gender: gender,
          registrationAnswers: submissionResult.answers // Store all registration answers if needed later
        });
        setCurrentView('bodySelector'); // Navigate to the body selector page
      } else {
        // Handle cases where patientId or answers might be missing from registration result
        console.error("Registration submission successful, but patientId or answers missing in result:", submissionResult);
        alert("Registration seemed successful, but some patient details are missing. Please contact support or try again.");
        // Optionally, you might want to stay on registration or show an error view
        // For now, we'll just log and alert.
      }
    } else {
      // This was a specialty questionnaire (e.g., dermatology)
      alert(`Thank you, ${currentPatientInfo?.name || 'Patient'}, your responses for the ${submittedQuestionnaireKey} questionnaire have been submitted.`);
      // After a specialty questionnaire, navigate back to the body selector page
      // or to a "thank you / what's next" page.
      setCurrentView('bodySelector');
    }
  };

  const handleAreaSelected = (selectedQuestionnaireKey) => {
    if (currentPatientInfo && currentPatientInfo.id) {
      setActiveQuestionnaireProps({
        key: selectedQuestionnaireKey,
        version: null, // Fetch the latest version of this specialty questionnaire
        patientId: currentPatientInfo.id // Pass the current patient's ID
      });
      setCurrentView('questionnaire'); // Switch view to show the selected specialty questionnaire
    } else {
      // This should ideally not happen if the user flow is correct (i.e., user is registered)
      alert("Patient information is missing. Please complete the registration first.");
      setCurrentView('registration'); // Redirect to registration
      setActiveQuestionnaireProps({ key: 'PATIENT_REG_001', version: null, patientId: null }); // Reset to registration props
    }
  };

  // Determine what content to render based on the currentView state
  let contentToRender;
  if (currentView === 'registration' && activeQuestionnaireProps.key === 'PATIENT_REG_001') {
    contentToRender = (
      <Questionnaire
        // Using a unique key forces React to re-mount the Questionnaire component
        // when the questionnaireKey or version changes, ensuring useEffect re-runs
        // and fetches the new questionnaire.
        key={`questionnaire-${activeQuestionnaireProps.key}-${activeQuestionnaireProps.version || 'latest'}`}
        questionnaireKey={activeQuestionnaireProps.key}
        questionnaireVersion={activeQuestionnaireProps.version}
        // patientId is null for initial registration, handled by backend
        onQuestionnaireSubmitSuccess={(result) => handleQuestionnaireSubmitSuccess(result, activeQuestionnaireProps.key)}
      />
    );
  } else if (currentView === 'bodySelector' && currentPatientInfo) {
    contentToRender = (
      <BodySelectorPage
        patientInfo={currentPatientInfo}
        onAreaSelected={handleAreaSelected}
      />
    );
  } else if (currentView === 'questionnaire' && activeQuestionnaireProps.key && activeQuestionnaireProps.key !== 'PATIENT_REG_001' && currentPatientInfo) {
    contentToRender = (
      <Questionnaire
        key={`questionnaire-${activeQuestionnaireProps.key}-${activeQuestionnaireProps.version || 'latest'}-${activeQuestionnaireProps.patientId}`}
        questionnaireKey={activeQuestionnaireProps.key}
        questionnaireVersion={activeQuestionnaireProps.version}
        patientId={activeQuestionnaireProps.patientId} // Pass patientId for specialty questionnaires
        onQuestionnaireSubmitSuccess={(result) => handleQuestionnaireSubmitSuccess(result, activeQuestionnaireProps.key)}
      />
    );
  } else if (currentView === 'registration' && activeQuestionnaireProps.key !== 'PATIENT_REG_001') {
    // If view is registration but key is not PATIENT_REG_001, reset to registration
    // This is a safeguard.
    setActiveQuestionnaireProps({ key: 'PATIENT_REG_001', version: null, patientId: null });
    // The component will re-render, and the first 'if' block will catch it.
    contentToRender = <p>Resetting to registration...</p>;
  }
  else {
    // Fallback content or initial loading state if currentView doesn't match known states,
    // or if currentPatientInfo is missing when expected.
    contentToRender = <p>Loading application or an unexpected state has occurred...</p>;
    // If patient info is lost and not in registration, redirect to registration
    if (!currentPatientInfo && currentView !== 'registration') {
        setCurrentView('registration');
        setActiveQuestionnaireProps({ key: 'PATIENT_REG_001', version: null, patientId: null });
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          Medical Questionnaire 
          {currentPatientInfo ? ` - Welcome, ${currentPatientInfo.name}!` : ''}
        </h1>
      </header>
      <main>
        {contentToRender}
      </main>
    </div>
  );
}

export default App;
