const radios = document.querySelectorAll('input[name="identity"]');
const checkbox = document.getElementById('more-info');
const formA = document.getElementById('look-up-by-name');
const formB = document.getElementById('look-up-by-id');
const inputSection = document.getElementById('input-section');
const inputId = document.getElementById('input-id');
const inputLabel = document.getElementById('input-label');

function updateForms() {
    try {

        formA.classList.remove('active');
        formB.classList.remove('active');
        inputSection.classList.remove('active');
    
        const selected = document.querySelector('input[name="identity"]:checked');
        
        if (!selected) return;

        if (selected.value === "Name") {
            inputLabel.textContent = 'Name';
            inputId.placeholder = 'Enter your name';
            inputSection.classList.add('active')
            if (checkbox.checked) {
                formA.classList.add('active');
            }
        } else if (selected.value === "Identity Number") {
            inputLabel.textContent = 'Identity Number';
            inputId.placeholder = 'Enter your identity number';
            inputSection.classList.add('active')
            if (checkbox.checked) {
                formB.classList.add('active');
            }
        }
    } catch (err) {
        console.error("Error in updateForms:", err);
    }
}


radios.forEach(radio => radio.addEventListener('change', updateForms));
checkbox.addEventListener('change', updateForms);

updateForms();