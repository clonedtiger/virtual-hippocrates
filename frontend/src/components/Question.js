import React from 'react';
import './Question.css';

const Question = ({ question, onAnswerChange, answer }) => {
  const inputId = `q-${question.id}`;

  // This local handler is specifically for checkboxes.
  // It creates an object of answers and passes the whole object up to the parent.
  const handleCheckboxChange = (optionValue, isChecked) => {
    const currentAnswers = answer || {};
    const newAnswers = {
      ...currentAnswers,
      [optionValue]: isChecked,
    };
    onAnswerChange(question.id, newAnswers);
  };

  const renderInput = () => {
    switch (question.inputType) {
      case 'textInput':
        return (
          <input
            type="text"
            id={inputId}
            value={answer || ''}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            maxLength={question.validation?.maxLength}
            aria-describedby={question.instructions ? `${inputId}-instructions` : undefined}
          />
        );

      case 'textArea':
        return (
          <textarea
            id={inputId}
            value={answer || ''}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            maxLength={question.validation?.maxLength}
            rows="4"
            aria-describedby={question.instructions ? `${inputId}-instructions` : undefined}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            id={inputId}
            value={answer || ''}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            aria-describedby={question.instructions ? `${inputId}-instructions` : undefined}
          />
        );

      case 'radio':
        return (
          <fieldset role="radiogroup" aria-labelledby={`${inputId}-label`}>
            <legend id={`${inputId}-label`} className="sr-only">{question.text}</legend>
            {question.options.map(opt => (
              <div key={opt.value} className="radio-option">
                <input
                  type="radio"
                  id={`${inputId}-${opt.value}`}
                  name={question.id}
                  value={opt.value}
                  checked={answer === opt.value}
                  onChange={(e) => onAnswerChange(question.id, e.target.value)}
                  aria-describedby={question.instructions ? `${inputId}-instructions` : undefined}
                />
                <label htmlFor={`${inputId}-${opt.value}`}>{opt.label}</label>
              </div>
            ))}
          </fieldset>
        );

      case 'checkbox':
        if (!question.options || !Array.isArray(question.options)) {
          return <p>Checkbox options not configured correctly for question ID: {question.id}</p>;
        }
        const checkboxGroupAnswers = answer || {}; 
        return (
          <fieldset role="group" aria-labelledby={`${inputId}-label`}>
            <legend id={`${inputId}-label`} className="sr-only">{question.text}</legend>
            {question.options.map(opt => (
              <div key={opt.value} className="checkbox-option">
                <input
                  type="checkbox"
                  id={`${inputId}-${opt.value}`}
                  name={`${question.id}-${opt.value}`}
                  value={opt.value}
                  checked={!!checkboxGroupAnswers[opt.value]}
                  onChange={(e) => handleCheckboxChange(opt.value, e.target.checked)}
                  aria-describedby={question.instructions ? `${inputId}-instructions` : undefined}
                />
                <label htmlFor={`${inputId}-${opt.value}`}>{opt.label}</label>
              </div>
            ))}
          </fieldset>
        );

      case 'dropdown':
        return (
          <select
            id={inputId}
            value={answer || ''}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            aria-describedby={question.instructions ? `${inputId}-instructions` : undefined}
          >
            <option value="">Select...</option>
            {question.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      default:
        return <p>Question type not supported: {question.inputType}</p>;
    }
  };

  return (
    <div className="question-container">
      <label id={`${inputId}-label`} className="question-text" htmlFor={inputId}>
        {question.text}
        {question.isRequired && <span className="required-indicator">*</span>}
      </label>
      {question.instructions && <p id={`${inputId}-instructions`} className="question-instructions">{question.instructions}</p>}
      {renderInput()}
    </div>
  );
};

export default Question;