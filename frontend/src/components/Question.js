// frontend/src/components/Question.js
import React from 'react';
import './Question.css'; // For basic styling

function Question({ question, value, onAnswerChange, onQuestionShouldAdvance }) {
  
  // General handler for most inputs (text, number, email, tel, date, textarea, dropdown)
  const handleStandardInputChange = (e) => {
    onAnswerChange(question.id, e.target.value, null, question.inputType); 
  };

  // Specific handler for radio button changes
  const handleRadioChange = (optionValue) => {
    onAnswerChange(question.id, optionValue, null, question.inputType);
  };

  // Specific handler for individual checkbox changes
  const handleCheckboxChange = (optionValue, isChecked) => {
    onAnswerChange(question.id, optionValue, isChecked, question.inputType);
  };

  // Handler for Enter key press on applicable input types
  const handleInputKeyDown = (event) => {
    const navigableInputTypes = ['textInput', 'number', 'email', 'tel', 'date'];
    if (navigableInputTypes.includes(question.inputType)) {
      if (event.key === 'Enter') {
        event.preventDefault(); 
        if (onQuestionShouldAdvance) {
          onQuestionShouldAdvance();
        }
      }
    }
  };

  const renderInput = () => {
    const inputId = `question-${question.id}`;
    switch (question.inputType) {
      case 'textInput':
        return <input type="text" id={inputId} name={question.id} value={value || ''} onChange={handleStandardInputChange} onKeyDown={handleInputKeyDown} required={question.isRequired} minLength={question.validation?.minLength} maxLength={question.validation?.maxLength} aria-describedby={question.instructions ? `${inputId}-instructions` : undefined} />;
      case 'number':
        return <input type="number" id={inputId} name={question.id} value={value || ''} onChange={handleStandardInputChange} onKeyDown={handleInputKeyDown} required={question.isRequired} min={question.validation?.minValue} max={question.validation?.maxValue} aria-describedby={question.instructions ? `${inputId}-instructions` : undefined} />;
      case 'email':
        return <input type="email" id={inputId} name={question.id} value={value || ''} onChange={handleStandardInputChange} onKeyDown={handleInputKeyDown} required={question.isRequired} pattern={question.validation?.pattern} aria-describedby={question.instructions ? `${inputId}-instructions` : undefined} />;
      case 'tel':
        return <input type="tel" id={inputId} name={question.id} value={value || ''} onChange={handleStandardInputChange} onKeyDown={handleInputKeyDown} required={question.isRequired} pattern={question.validation?.pattern} aria-describedby={question.instructions ? `${inputId}-instructions` : undefined} />;
      case 'date':
        return <input type="date" id={inputId} name={question.id} value={value || ''} onChange={handleStandardInputChange} onKeyDown={handleInputKeyDown} required={question.isRequired} aria-describedby={question.instructions ? `${inputId}-instructions` : undefined} />;
      case 'textArea':
        return <textarea id={inputId} name={question.id} value={value || ''} onChange={handleStandardInputChange} required={question.isRequired} minLength={question.validation?.minLength} maxLength={question.validation?.maxLength} rows={4} aria-describedby={question.instructions ? `${inputId}-instructions` : undefined}></textarea>;
      case 'dropdown':
        return (
          <select id={inputId} name={question.id} value={value || ''} onChange={handleStandardInputChange} required={question.isRequired} aria-describedby={question.instructions ? `${inputId}-instructions` : undefined}>
            <option value="">--Please choose an option--</option>
            {question.options && question.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <fieldset role="radiogroup" aria-labelledby={`${inputId}-label`}>
            <legend id={`${inputId}-label`} className="sr-only">{question.text}</legend>
            {question.options && question.options.map(opt => (
              <div key={opt.value} className="radio-option">
                <input
                  type="radio"
                  id={`${inputId}-${opt.value}`}
                  name={question.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => handleRadioChange(opt.value)}
                  required={question.isRequired}
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
        // 'value' prop for a checkbox group should be an object like: { optValue1: true, optValue2: false }
        const checkboxGroupAnswers = value || {}; 
        return (
          <fieldset role="group" aria-labelledby={`${inputId}-label`}>
            <legend id={`${inputId}-label`} className="sr-only">{question.text}</legend>
            {question.options.map(opt => (
              <div key={opt.value} className="checkbox-option">
                <input
                  type="checkbox"
                  id={`${inputId}-${opt.value}`}
                  name={`${question.id}-${opt.value}`} // Unique name for each checkbox
                  value={opt.value}
                  checked={!!checkboxGroupAnswers[opt.value]} // Check if this option's value is true in the answers object
                  onChange={(e) => handleCheckboxChange(opt.value, e.target.checked)}
                  aria-describedby={question.instructions ? `${inputId}-instructions` : undefined}
                />
                <label htmlFor={`${inputId}-${opt.value}`}>{opt.label}</label>
              </div>
            ))}
          </fieldset>
        );
      default:
        return <p>Unsupported input type: {question.inputType}</p>;
    }
  };

  return (
    <div className="question-container" role="group" aria-labelledby={`question-label-${question.id}`}>
      <label id={`question-label-${question.id}`} htmlFor={question.inputType !== 'radio' && question.inputType !== 'checkbox' ? `question-${question.id}` : undefined} className="question-text">
        {question.text}
        {question.isRequired && <span className="required-indicator" aria-hidden="true">*</span>}
      </label>
      {question.instructions && <p id={`question-${question.id}-instructions`} className="question-instructions">{question.instructions}</p>}
      {question.imageURL && <img src={question.imageURL} alt={question.text || 'Question illustration'} className="question-image" />}
      {renderInput()}
    </div>
  );
}

export default Question;
