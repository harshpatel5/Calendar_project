const monthName = document.getElementById('month-name');
const calendarGrid = document.getElementById('calendar-grid').querySelector('tbody');
const prevMonthButton = document.getElementById('prev-month');
const nextMonthButton = document.getElementById('next-month');

let currentDate = new Date();
let currentMonth = currentDate.getMonth(); 
let currentYear = currentDate.getFullYear();
let bookings = JSON.parse(localStorage.getItem('calendarBookings')) || {}; 

generateCalendar();

function generateCalendar() {
    const monthNameArr = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthName.textContent = `${monthNameArr[currentMonth]} ${currentYear}`;
    calendarGrid.textContent = '';

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay();

    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('td');
        calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const dayCell = document.createElement('td');
        const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
        dayCell.textContent = day;
        dayCell.setAttribute('date-tracker', dateKey);

        if (bookings[dateKey]) {
            dayCell.classList.add('booked');
            dayCell.title = `Booked: ${bookings[dateKey]}`;
        }

        dayCell.addEventListener('click', () => {
            openBookingForm(dateKey);
        });

        calendarGrid.appendChild(dayCell);

        if ((startDayOfWeek + day) % 7 === 0) {
            const addRow = document.createElement('tr');
            calendarGrid.appendChild(addRow);
        }
    }

 
    if (lastDayOfMonth.getDay() < 6) {
        for (let i = lastDayOfMonth.getDay(); i < 6; i++) {
            const emptyCell = document.createElement('td');
            calendarGrid.appendChild(emptyCell);
        }
    }
}

prevMonthButton.addEventListener('click', () => {

    if (currentMonth === 0 ){

        currentMonth = 11;
        currentYear = currentYear-1;
    }else {

        currentMonth = currentMonth-1;
    }
    
    generateCalendar();
});

nextMonthButton.addEventListener('click', () => {
    if (currentMonth === 11 ){

        currentMonth = 0;
        currentYear = currentYear+1;
    }else{

        currentMonth = currentMonth+1;
    }
    generateCalendar();
});

function openBookingForm(dateKey) {
    if (bookings[dateKey]) {

        const cancelConfirmation = confirm(`This date is already booked for: "${bookings[dateKey]}". Would you like to cancel the booking?`);
        if (cancelConfirmation) {
            delete bookings[dateKey]; 
            saveBookings();
            generateCalendar(); 
            alert(`Booking for ${dateKey} has been canceled.`);
        }
    } else {
        const reason = prompt(`Enter a reason for booking ${dateKey}:`);
        if (reason) {
            bookings[dateKey] = reason; 
            saveBookings(); 
            generateCalendar(); 
        }
    }
}

function saveBookings() {
    localStorage.setItem('calendarBookings', JSON.stringify(bookings));
}

