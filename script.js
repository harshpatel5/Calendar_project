const monthName = document.getElementById('month-name');
const calendarGrid = document.getElementById('calendar-grid').querySelector('tbody');
const prevMonthButton = document.getElementById('prev-month');
const nextMonthButton = document.getElementById('next-month');
const viewButtons = document.querySelectorAll('.view-btn');
const eventModal = document.getElementById('event-modal');
const eventForm = document.getElementById('event-form');
const addEventButton = document.getElementById('add-event');
const closeModalButton = document.querySelector('.close');
const deleteEventButton = document.getElementById('delete-event');
const eventsList = document.getElementById('events-list');

let currentDate = new Date();
let currentMonth = currentDate.getMonth(); 
let currentYear = currentDate.getFullYear();
let currentView = 'month';
let selectedEventId = null;
let bookings = JSON.parse(localStorage.getItem('calendarBookings')) || {}; 
let events = JSON.parse(localStorage.getItem('calendarEvents')) || [];

// Initialize the application
function init() {
    generateCalendar();
    updateEventsList();
    
    // Set up event listeners
    
    // Recurring select change event
    const recurringSelect = document.getElementById('event-recurring');
    const recurringEndDate = document.getElementById('recurring-end-date');
    const recurringEndGroup = document.querySelector('.recurring-end-group');
    
    recurringSelect.addEventListener('change', () => {
        if (recurringSelect.value !== 'none') {
            recurringEndGroup.style.display = 'block';
            
            // If end date not set, set default to 1 year from start date
            if (!recurringEndDate.value) {
                const dateInput = document.getElementById('event-date');
                const startDate = new Date(dateInput.value);
                if (!isNaN(startDate.getTime())) {
                    const endDate = new Date(startDate);
                    endDate.setFullYear(endDate.getFullYear() + 1);
                    recurringEndDate.value = formatDate(endDate);
                } else {
                    const defaultEndDate = new Date();
                    defaultEndDate.setFullYear(defaultEndDate.getFullYear() + 1);
                    recurringEndDate.value = formatDate(defaultEndDate);
                }
            }
        } else {
            recurringEndGroup.style.display = 'none';
        }
    });
    
    // View switching
    viewButtons.forEach(button => {
        button.addEventListener('click', () => {
            viewButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentView = button.dataset.view;
            generateCalendar();
        });
    });
    
    // Navigation
    prevMonthButton.addEventListener('click', () => {
        if (currentMonth === 0) {
            currentMonth = 11;
            currentYear--;
        } else {
            currentMonth--;
        }
        generateCalendar();
    });

    nextMonthButton.addEventListener('click', () => {
        if (currentMonth === 11) {
            currentMonth = 0;
            currentYear++;
        } else {
            currentMonth++;
        }
        generateCalendar();
    });
    
    // Event modal
    addEventButton.addEventListener('click', () => {
        openEventModal();
    });

    closeModalButton.addEventListener('click', () => {
        closeEventModal();
    });

    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEvent();
    });

    deleteEventButton.addEventListener('click', () => {
        if (selectedEventId) {
            deleteEvent(selectedEventId);
            closeEventModal();
        }
    });
}

function generateCalendar() {
    const monthNameArr = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthName.textContent = `${monthNameArr[currentMonth]} ${currentYear}`;
    calendarGrid.innerHTML = '';
    
    // Update calendar grid classes based on current view
    const calendarTable = document.getElementById('calendar-grid');
    calendarTable.className = ''; // Clear any existing classes
    calendarTable.classList.add(currentView + '-view');

    switch (currentView) {
        case 'month':
            generateMonthView();
            break;
        case 'week':
            generateWeekView();
            break;
        case 'day':
            generateDayView();
            break;
    }
}

function generateMonthView() {
    // Restore default thead for month view
    const thead = calendarGrid.parentElement.querySelector('thead');
    thead.innerHTML = `
        <tr>
            <th>Sun</th>
            <th>Mon</th>
            <th>Tue</th>
            <th>Wed</th>
            <th>Thu</th>
            <th>Fri</th>
            <th>Sat</th>
        </tr>
    `;
    
    // Clear tbody
    calendarGrid.innerHTML = '';
    
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay();

    let currentRow = document.createElement('tr');
    calendarGrid.appendChild(currentRow);

    // Empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('td');
        currentRow.appendChild(emptyCell);
    }

    // Days of the month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        if ((startDayOfWeek + day - 1) % 7 === 0 && day !== 1) {
            currentRow = document.createElement('tr');
            calendarGrid.appendChild(currentRow);
        }

        const dayCell = document.createElement('td');
        dayCell.textContent = day;
        
        const dateStr = formatDate(new Date(currentYear, currentMonth, day));
        const dayEvents = getEventsForDate(dateStr);
        
        if (dayEvents.length > 0) {
            dayEvents.forEach(event => {
                const eventIndicator = document.createElement('div');
                eventIndicator.className = 'event-indicator';
                eventIndicator.textContent = event.title || 'Untitled Event';
                eventIndicator.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEventModal(event);
                });
                dayCell.appendChild(eventIndicator);
            });
        }

        dayCell.addEventListener('click', () => {
            const newEvent = {
                date: dateStr
            };
            openEventModal(newEvent);
        });

        currentRow.appendChild(dayCell);
    }

    // Fill remaining cells
    const lastRow = calendarGrid.lastElementChild;
    const remainingCells = 7 - lastRow.children.length;
    for (let i = 0; i < remainingCells; i++) {
        const emptyCell = document.createElement('td');
        lastRow.appendChild(emptyCell);
    }
}

function generateWeekView() {
    // Clear existing thead to rebuild it properly
    const thead = calendarGrid.parentElement.querySelector('thead');
    thead.innerHTML = '';
    
    // Create new header row with proper alignment
    const headerRow = document.createElement('tr');
    
    // Empty cell above time column
    const emptyHeader = document.createElement('th');
    headerRow.appendChild(emptyHeader);
    
    // Calculate the start of the week (Sunday) based on current date
    const startOfWeek = new Date(currentYear, currentMonth, currentDate.getDate());
    // Move to the previous Sunday if not already on Sunday
    while (startOfWeek.getDay() !== 0) {
        startOfWeek.setDate(startOfWeek.getDate() - 1);
    }

    // Add day headers aligned with Sun-Sat
    for (let i = 0; i < 7; i++) {
        const dayHeader = document.createElement('th');
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i];
        dayHeader.textContent = `${dayName} ${day.getDate()}/${day.getMonth() + 1}`;
        headerRow.appendChild(dayHeader);
    }
    
    thead.appendChild(headerRow);
    
    // Clear tbody
    calendarGrid.innerHTML = '';

    // Create time slots (just show 8am to 8pm for a cleaner view)
    for (let hour = 8; hour <= 20; hour++) {
        const row = document.createElement('tr');
        
        // Add time column
        const timeCell = document.createElement('td');
        timeCell.textContent = `${hour.toString().padStart(2, '0')}:00`;
        row.appendChild(timeCell);

        // Add cells for each day
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('td');
            const currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + day);
            const dateStr = formatDate(currentDay);
            
            // Get events for this time slot
            const dayEvents = getEventsForDate(dateStr).filter(event => {
                if (!event.time) return false;
                const eventHour = parseInt(event.time.split(':')[0]);
                return eventHour === hour;
            });

            dayEvents.forEach(event => {
                const eventIndicator = document.createElement('div');
                eventIndicator.className = 'event-indicator';
                eventIndicator.textContent = event.title || 'Untitled Event';
                eventIndicator.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEventModal(event);
                });
                cell.appendChild(eventIndicator);
            });

            cell.addEventListener('click', () => {
                const newEvent = {
                    date: dateStr,
                    time: `${hour.toString().padStart(2, '0')}:00`
                };
                openEventModal(newEvent);
            });

            row.appendChild(cell);
        }
        calendarGrid.appendChild(row);
    }
}

function generateDayView() {
    // Clear existing thead to rebuild it properly
    const thead = calendarGrid.parentElement.querySelector('thead');
    thead.innerHTML = '';
    
    // Create new header row
    const headerRow = document.createElement('tr');
    
    // Empty cell above time column
    const emptyHeader = document.createElement('th');
    headerRow.appendChild(emptyHeader);
    
    const dayHeader = document.createElement('th');
    dayHeader.textContent = `${currentDate.getDate()}/${currentMonth + 1}/${currentYear}`;
    dayHeader.colSpan = 6;
    headerRow.appendChild(dayHeader);
    thead.appendChild(headerRow);
    
    // Clear tbody
    calendarGrid.innerHTML = '';

    // Create time slots for business hours (8am to 8pm)
    for (let hour = 8; hour <= 20; hour++) {
        const row = document.createElement('tr');
        
        // Add time column
        const timeCell = document.createElement('td');
        timeCell.textContent = `${hour.toString().padStart(2, '0')}:00`;
        row.appendChild(timeCell);

        // Add event cell
        const eventCell = document.createElement('td');
        eventCell.colSpan = 6;
        const dateStr = formatDate(currentDate);
        
        // Get events for this time slot
        const dayEvents = getEventsForDate(dateStr).filter(event => {
            if (!event.time) return false;
            const eventHour = parseInt(event.time.split(':')[0]);
            return eventHour === hour;
        });

        dayEvents.forEach(event => {
            const eventIndicator = document.createElement('div');
            eventIndicator.className = 'event-indicator';
            eventIndicator.textContent = event.title || 'Untitled Event';
            eventIndicator.addEventListener('click', (e) => {
                e.stopPropagation();
                openEventModal(event);
            });
            eventCell.appendChild(eventIndicator);
        });

        eventCell.addEventListener('click', () => {
            const newEvent = {
                date: dateStr,
                time: `${hour.toString().padStart(2, '0')}:00`
            };
            openEventModal(newEvent);
        });

        row.appendChild(eventCell);
        calendarGrid.appendChild(row);
    }
}

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

// Event management
function openEventModal(event = null) {
    const titleInput = document.getElementById('event-title');
    const dateInput = document.getElementById('event-date');
    const timeInput = document.getElementById('event-time');
    const descriptionInput = document.getElementById('event-description');
    const locationInput = document.getElementById('event-location');
    const linkInput = document.getElementById('event-link');
    const recurringSelect = document.getElementById('event-recurring');
    const recurringEndDate = document.getElementById('recurring-end-date');
    const recurringEndGroup = document.querySelector('.recurring-end-group');
    
    // Set current date + 1 year as default end date for recurring events
    const defaultEndDate = new Date();
    defaultEndDate.setFullYear(defaultEndDate.getFullYear() + 1);
    const defaultEndDateStr = formatDate(defaultEndDate);
    
    if (event) {
        selectedEventId = event.id;
        titleInput.value = event.title || '';
        dateInput.value = event.date || '';
        timeInput.value = event.time || '';
        descriptionInput.value = event.description || '';
        locationInput.value = event.location || '';
        linkInput.value = event.link || '';
        recurringSelect.value = event.recurring || 'none';
        recurringEndDate.value = event.recurringEndDate || defaultEndDateStr;
        deleteEventButton.style.display = event.id ? 'block' : 'none';
        
        // Show/hide recurring end date based on selection
        if (event.recurring && event.recurring !== 'none') {
            recurringEndGroup.style.display = 'block';
        } else {
            recurringEndGroup.style.display = 'none';
        }
    } else {
        selectedEventId = null;
        eventForm.reset();
        recurringEndDate.value = defaultEndDateStr;
        deleteEventButton.style.display = 'none';
        recurringEndGroup.style.display = 'none';
    }
    
    eventModal.style.display = 'block';
}

function closeEventModal() {
    eventModal.style.display = 'none';
    selectedEventId = null;
    eventForm.reset();
}

function saveEvent() {
    const titleInput = document.getElementById('event-title');
    const dateInput = document.getElementById('event-date');
    const timeInput = document.getElementById('event-time');
    const descriptionInput = document.getElementById('event-description');
    const locationInput = document.getElementById('event-location');
    const linkInput = document.getElementById('event-link');
    const recurringSelect = document.getElementById('event-recurring');
    const recurringEndDate = document.getElementById('recurring-end-date');
    
    const eventData = {
        id: selectedEventId || Date.now(),
        title: titleInput.value.trim() || 'Untitled Event',
        date: dateInput.value,
        time: timeInput.value,
        description: descriptionInput.value.trim(),
        location: locationInput.value.trim(),
        link: linkInput.value.trim(),
        recurring: recurringSelect.value,
        recurringEndDate: recurringSelect.value !== 'none' ? recurringEndDate.value : null
    };

    if (selectedEventId) {
        const index = events.findIndex(e => e.id === selectedEventId);
        if (index !== -1) {
            events[index] = eventData;
        }
    } else {
        events.push(eventData);
        
        // Handle recurring events
        if (eventData.recurring !== 'none') {
            const baseDate = new Date(eventData.date);
            const endDate = new Date(eventData.recurringEndDate || '');
            
            // Use the provided end date or default to 1 year if invalid
            const validEndDate = !isNaN(endDate.getTime()) ? endDate : new Date(baseDate);
            if (isNaN(validEndDate.getTime())) {
                validEndDate.setFullYear(validEndDate.getFullYear() + 1);
            }
            
            const recurringEvents = generateRecurringEvents(eventData, baseDate, validEndDate);
            events = events.concat(recurringEvents);
        }
    }

    localStorage.setItem('calendarEvents', JSON.stringify(events));
    closeEventModal();
    generateCalendar();
    updateEventsList();
}

function deleteEvent(eventId) {
    // Find the event to be deleted
    const eventToDelete = events.find(event => event.id === eventId);
    
    if (eventToDelete) {
        if (eventToDelete.recurring && eventToDelete.recurring !== 'none') {
            // For recurring events, delete all instances
            events = events.filter(event => {
                // Keep events that are not part of this recurring series
                return event.title !== eventToDelete.title || 
                       event.date < eventToDelete.date || 
                       (event.recurringEndDate && event.recurringEndDate !== eventToDelete.recurringEndDate);
            });
        } else {
            // For non-recurring events, just delete the specific event
            events = events.filter(event => event.id !== eventId);
        }
        
        localStorage.setItem('calendarEvents', JSON.stringify(events));
        generateCalendar();
        updateEventsList();
    }
}

function updateEventsList() {
    eventsList.innerHTML = '';
    const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedEvents.forEach(event => {
        const eventElement = createEventElement(event);
        eventsList.appendChild(eventElement);
    });
}

// Helper functions
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function getEventsForDate(dateStr) {
    return events.filter(event => event.date === dateStr);
}

function createEventElement(event) {
    const element = document.createElement('div');
    element.className = 'event-item';
    
    // Format date for display
    let formattedDate = 'No date';
    if (event.date) {
        // Create date object and adjust for timezone
        const [year, month, day] = event.date.split('-');
        const dateObj = new Date(year, month - 1, day); // month is 0-based in JavaScript
        formattedDate = dateObj.toLocaleDateString();
    }
    
    // Format recurring end date if exists
    let recurringInfo = '';
    if (event.recurring && event.recurring !== 'none') {
        recurringInfo = `<div class="event-recurring">(${event.recurring}`;
        
        if (event.recurringEndDate) {
            const [year, month, day] = event.recurringEndDate.split('-');
            const endDate = new Date(year, month - 1, day);
            const formattedEndDate = endDate.toLocaleDateString();
            recurringInfo += ` until ${formattedEndDate}`;
        }
        
        recurringInfo += ')</div>';
    }
    
    // Create display strings with fallbacks
    const title = event.title || 'Untitled Event';
    const time = event.time ? ` at ${event.time}` : '';
    const location = event.location ? `<div class="event-location">📍 ${event.location}</div>` : '';
    const link = event.link ? `<div class="event-link"><a href="${event.link}" target="_blank">🔗 Join Meeting</a></div>` : '';
    
    element.innerHTML = `
        <strong class="event-title">${title}</strong>
        <div class="event-datetime">${formattedDate}${time}</div>
        ${location}
        ${link}
        ${recurringInfo}
    `;
    
    if (event.description && event.description.trim()) {
        const descriptionElement = document.createElement('div');
        descriptionElement.className = 'event-description';
        descriptionElement.textContent = event.description;
        element.appendChild(descriptionElement);
    }
    
    element.addEventListener('click', () => openEventModal(event));
    return element;
}

function generateRecurringEvents(baseEvent, startDate, endDate) {
    const recurringEvents = [];
    
    // Use ISO strings instead of Date objects to avoid timezone issues
    let currentDateStr = formatDate(startDate);
    
    while (new Date(currentDateStr) < endDate) {
        // Get components from the current date string
        const [year, month, day] = currentDateStr.split('-').map(num => parseInt(num, 10));
        let nextDate;
        
        switch (baseEvent.recurring) {
            case 'daily':
                // Create date object, add one day, then convert back to string
                nextDate = new Date(year, month - 1, day + 1);
                break;
            case 'weekly':
                // Create date object, add exactly 7 days, then convert back to string
                nextDate = new Date(year, month - 1, day + 7);
                break;
            case 'monthly':
                // Create date object, add one month, then convert back to string
                nextDate = new Date(year, month, day);
                break;
            default:
                return recurringEvents;
        }
        
        currentDateStr = formatDate(nextDate);
        
        if (new Date(currentDateStr) < endDate) {
            recurringEvents.push({
                ...baseEvent,
                id: Date.now() + recurringEvents.length,
                date: currentDateStr
            });
        }
    }
    
    return recurringEvents;
}

// Run initialization
init();