const radios = document.querySelectorAll('input[name="identity"]');
const checkboxSection = document.getElementById('more-info');
const checkbox = document.getElementById('checkbox');
const formA = document.getElementById('look-up-by-name');
const formB = document.getElementById('look-up-by-id');
const inputSection = document.getElementById('input-section');
const inputId = document.getElementById('input-id');
const inputLabel = document.getElementById('input-label');
const searchSection = document.getElementById('search-section');
const search = document.getElementById('search');

function updateForms() {
    try {
        searchSection.classList.remove('active')
        checkboxSection.classList.remove('active');
        formA.classList.remove('active');
        formB.classList.remove('active');
        inputSection.classList.remove('active');
    
        const selected = document.querySelector('input[name="identity"]:checked');
        
        if (!selected) return;

        if (selected.value === "Name") {
            checkboxSection.classList.add('active');
            inputLabel.textContent = 'Name';
            inputId.placeholder = 'Enter your name';
            inputSection.classList.add('active')
            searchSection.classList.add('active');
            if (checkbox.checked) {
                formA.classList.add('active');
                searchSection.classList.add('active');
            }
        } else if (selected.value === "Identity Number") {
            checkboxSection.classList.add('active');
            inputLabel.textContent = 'Identity Number';
            inputId.placeholder = 'Enter your identity number';
            inputSection.classList.add('active');
            searchSection.classList.add('active');
            if (checkbox.checked) {
                formB.classList.add('active');
                searchSection.classList.add('active');
            }
        }
    } catch (err) {
        console.error("Error in updateForms:", err);
    }
}


radios.forEach(radio => radio.addEventListener('change', updateForms));
checkbox.addEventListener('change', updateForms);

updateForms();