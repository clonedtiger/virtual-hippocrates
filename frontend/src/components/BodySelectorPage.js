// frontend/src/components/BodySelectorPage.js
import React from 'react';
// import './BodySelectorPage.css'; // Create this CSS file for styling if you want separate styles

// Placeholder for image paths if you implement visual selection later:
// const manImage = '/images/body_man.png'; // Example path in public/images folder
// const womanImage = '/images/body_woman.png';
// const neutralImage = '/images/body_neutral.png';

function BodySelectorPage({ patientInfo, onAreaSelected }) {
  // Function to get image based on gender (for future visual enhancement)
  // const getImagePath = () => {
  //   const gender = patientInfo?.gender?.toLowerCase();
  //   if (gender === 'male') return manImage;
  //   if (gender === 'female') return womanImage;
  //   return neutralImage; // Default for 'neutral', 'other', 'prefer_not_to_say', or undefined
  // };

  // Mapping areas to their respective questionnaire keys.
  // These questionnaireKeys MUST match the 'questionnaireId' in your JSON files
  // and subsequently the 'questionnaire_key' in your database.
  const areas = [
    { label: "GP Triage Questions", questionnaireKey: "GP_SYMPTOM_ASSESSMENT_001" },
    { label: "Skin Concerns", questionnaireKey: "DERM_CONSULT_001" },
    { label: "Heart / Chest Issues", questionnaireKey: "CARDIO_CONSULT_001" }, 
    { label: "Head / Neurological Issues", questionnaireKey: "NEURO_CONSULT_001" }, 
    { label: "Stomach / Digestive Issues", questionnaireKey: "GASTRO_CONSULT_001" },
    // You can uncomment and add more as you create the corresponding JSON questionnaires:
    { label: "Joint / Bone Issues (Orthopaedics)", questionnaireKey: "ORTHO_CONSULT_001" },
    // { label: "Urinary Issues (Urology)", questionnaireKey: "URO_CONSULT_001" },
    // { label: "General Aches / Pains (Rheumatology)", questionnaireKey: "RHEUM_CONSULT_001" },
    // { label: "Hearing / Ear Issues (Audiology)", questionnaireKey: "AUDIO_CONSULT_001" },
    // { label: "Eye Issues (Ophthalmology)", questionnaireKey: "OPHTHAL_CONSULT_001" },
    // Add more categories as needed
  ];

  return (
    <div className="body-selector-container" style={{ padding: '20px', textAlign: 'center' }}>
      <h2>
        Please select the primary area of your health concern, {patientInfo && patientInfo.name ? patientInfo.name : 'Patient'}.
      </h2>
      
      {/* // Placeholder for future image-based selection
      <div style={{ margin: '20px 0', border: '1px dashed #ccc', padding: '10px', minHeight: '200px' }}>
        <p><em>(Imagine an interactive body diagram here based on gender: {patientInfo?.gender})</em></p>
        {/* <img 
            src={getImagePath()} 
            alt={`Body illustration for ${patientInfo?.gender || 'selection'}`} 
            style={{ maxWidth: '250px', height: 'auto', margin: '10px auto', display: 'block' }} 
        /> *}
        <p style={{ fontStyle: 'italic', color: '#777' }}>
          For now, please use the buttons below.
        </p>
      </div> 
      */}

      <div 
        className="area-buttons" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '15px', // Increased gap for better spacing
          marginTop: '20px'
        }}
      >
        {areas.map(area => (
          <button 
            key={area.questionnaireKey} 
            onClick={() => onAreaSelected(area.questionnaireKey)}
            style={{ 
              padding: '12px 25px', 
              fontSize: '1em', // Relative font size
              minWidth: '300px', // Wider buttons
              cursor: 'pointer',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            aria-label={`Select questionnaire for ${area.label}`}
          >
            {area.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default BodySelectorPage;
