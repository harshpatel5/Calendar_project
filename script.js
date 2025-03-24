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
        if (currentView === 'week') {
            // Move back by 7 days for week view
            currentDate = new Date(currentYear, currentMonth, currentDate.getDate() - 7);
            currentMonth = currentDate.getMonth();
            currentYear = currentDate.getFullYear();
        } else if (currentView === 'day') {
            // Move back by 1 day for day view
            currentDate = new Date(currentYear, currentMonth, currentDate.getDate() - 1);
            currentMonth = currentDate.getMonth();
            currentYear = currentDate.getFullYear();
        } else {
            // Default month view behavior
            if (currentMonth === 0) {
                currentMonth = 11;
                currentYear--;
            } else {
                currentMonth--;
            }
        }
        generateCalendar();
    });

    nextMonthButton.addEventListener('click', () => {
        if (currentView === 'week') {
            // Move forward by 7 days for week view
            currentDate = new Date(currentYear, currentMonth, currentDate.getDate() + 7);
            currentMonth = currentDate.getMonth();
            currentYear = currentDate.getFullYear();
        } else if (currentView === 'day') {
            // Move forward by 1 day for day view
            currentDate = new Date(currentYear, currentMonth, currentDate.getDate() + 1);
            currentMonth = currentDate.getMonth();
            currentYear = currentDate.getFullYear();
        } else {
            // Default month view behavior
            if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
            } else {
                currentMonth++;
            }
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
    
    // Adjust the heading to show current week range
    monthName.textContent = getWeekRangeText(startOfWeek);
    
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
    
    // Update month name to show current date
    const monthNameArr = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthName.textContent = `${monthNameArr[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    
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
    const recurringSelect = document.getElementById('event-recurring');
    const recurringEndDate = document.getElementById('recurring-end-date');
    
    const eventData = {
        id: selectedEventId || Date.now(),
        title: titleInput.value.trim() || 'Untitled Event',
        date: dateInput.value,
        time: timeInput.value,
        description: descriptionInput.value.trim(),
        recurring: recurringSelect.value,
        recurringEndDate: recurringSelect.value !== 'none' ? recurringEndDate.value : null
    };

    // Check for time conflicts
    if (eventData.time) {
        const conflictingEvents = events.filter(event => 
            event.id !== eventData.id && // Not the same event (for edits)
            event.date === eventData.date && // Same date
            event.time === eventData.time // Same time
        );
        
        if (conflictingEvents.length > 0) {
            const conflictEvent = conflictingEvents[0];
            alert(`Time conflict detected!\n\nThere is already an event "${conflictEvent.title}" scheduled at ${eventData.time} on ${eventData.date}.\n\nPlease choose a different time.`);
            return; // Don't save the event
        }
    }

    if (selectedEventId) {
        // Get the event being edited
        const originalEvent = events.find(e => e.id === selectedEventId);
        
        // Check if it's a recurring event
        if (originalEvent && originalEvent.recurring && originalEvent.recurring !== 'none') {
            const updateOptions = confirm(`Do you want to update all instances of "${originalEvent.title}"?\n\nClick OK to update all instances.\nClick Cancel to update only this specific date.`);
            
            if (updateOptions) {
                // Update all instances of this recurring series
                events = events.map(event => {
                    // If this event matches the recurring series (same title, recurring type, and end date)
                    if (event.title === originalEvent.title && 
                        event.recurring === originalEvent.recurring && 
                        event.recurringEndDate === originalEvent.recurringEndDate) {
                        
                        // Keep the original date but update all other properties
                        return {
                            ...eventData,
                            id: event.id,
                            date: event.date
                        };
                    }
                    return event;
                });
                
                // If recurring pattern or end date changed, remove old instances and generate new ones
                if (originalEvent.recurring !== eventData.recurring || 
                    originalEvent.recurringEndDate !== eventData.recurringEndDate) {
                    
                    // Remove all old recurring instances
                    events = events.filter(event => {
                        return event.title !== originalEvent.title || 
                               event.recurring !== originalEvent.recurring ||
                               event.recurringEndDate !== originalEvent.recurringEndDate;
                    });
                    
                    // Add the updated event
                    events.push(eventData);
                    
                    // Generate new recurring events if still recurring
                    if (eventData.recurring !== 'none') {
                        const baseDate = new Date(eventData.date);
                        const endDate = new Date(eventData.recurringEndDate || '');
                        
                        // Use provided end date or default to 1 year if invalid
                        const validEndDate = !isNaN(endDate.getTime()) ? endDate : new Date(baseDate);
                        if (isNaN(validEndDate.getTime())) {
                            validEndDate.setFullYear(validEndDate.getFullYear() + 1);
                        }
                        
                        const recurringEvents = generateRecurringEvents(eventData, baseDate, validEndDate);
                        
                        // Check for time conflicts in recurring events
                        if (eventData.time) {
                            const conflictEvents = [];
                            recurringEvents.forEach(recEvent => {
                                const conflicts = events.filter(event => 
                                    event.id !== recEvent.id && 
                                    event.date === recEvent.date && 
                                    event.time === recEvent.time
                                );
                                if (conflicts.length > 0) {
                                    conflictEvents.push({
                                        date: recEvent.date,
                                        time: recEvent.time,
                                        conflictWith: conflicts[0].title
                                    });
                                }
                            });
                            
                            if (conflictEvents.length > 0) {
                                const firstConflict = conflictEvents[0];
                                const [year, month, day] = firstConflict.date.split('-');
                                const dateObj = new Date(year, month - 1, day);
                                const formattedDate = dateObj.toLocaleDateString();
                                
                                alert(`Time conflict detected in recurring events!\n\nThere is already an event "${firstConflict.conflictWith}" scheduled at ${firstConflict.time} on ${formattedDate}.\n\n${conflictEvents.length > 1 ? `And ${conflictEvents.length - 1} more conflicts.` : ''}\n\nPlease adjust your recurring pattern or times.`);
                                return; // Don't save
                            }
                        }
                        
                        events = events.concat(recurringEvents);
                    }
                }
            } else {
                // Update only this specific instance
                const index = events.findIndex(e => e.id === selectedEventId);
                if (index !== -1) {
                    events[index] = eventData;
                }
            }
        } else {
            // Non-recurring event - just update this instance
            const index = events.findIndex(e => e.id === selectedEventId);
            if (index !== -1) {
                events[index] = eventData;
            }
        }
    } else {
        // New event
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
            
            // Check for time conflicts in recurring events
            if (eventData.time) {
                const conflictEvents = [];
                recurringEvents.forEach(recEvent => {
                    const conflicts = events.filter(event => 
                        event.id !== recEvent.id && 
                        event.date === recEvent.date && 
                        event.time === recEvent.time
                    );
                    if (conflicts.length > 0) {
                        conflictEvents.push({
                            date: recEvent.date,
                            time: recEvent.time,
                            conflictWith: conflicts[0].title
                        });
                    }
                });
                
                if (conflictEvents.length > 0) {
                    const firstConflict = conflictEvents[0];
                    const [year, month, day] = firstConflict.date.split('-');
                    const dateObj = new Date(year, month - 1, day);
                    const formattedDate = dateObj.toLocaleDateString();
                    
                    alert(`Time conflict detected in recurring events!\n\nThere is already an event "${firstConflict.conflictWith}" scheduled at ${firstConflict.time} on ${formattedDate}.\n\n${conflictEvents.length > 1 ? `And ${conflictEvents.length - 1} more conflicts.` : ''}\n\nPlease adjust your recurring pattern or times.`);
                    return; // Don't save
                }
            }
            
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
            // For recurring events, ask whether to delete just this instance or all instances
            const deleteOptions = confirm(`Do you want to delete all instances of "${eventToDelete.title}"?\n\nClick OK to delete all instances.\nClick Cancel to delete only this specific date.`);
            
            if (deleteOptions) {
                // Delete all instances of this recurring series
                events = events.filter(event => {
                    // Keep events that don't match this recurring series
                    return event.title !== eventToDelete.title || 
                           (event.recurring !== eventToDelete.recurring) ||
                           (event.recurringEndDate !== eventToDelete.recurringEndDate);
                });
            } else {
                // Delete only this specific instance
                events = events.filter(event => event.id !== eventId);
            }
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
    
    element.innerHTML = `
        <strong class="event-title">${title}</strong>
        <div class="event-datetime">${formattedDate}${time}</div>
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

// Helper function to get week range text (e.g., "Nov 3-9, 2024")
function getWeekRangeText(startOfWeek) {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const monthNameArr = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthNameShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // If week spans two months
    if (startOfWeek.getMonth() !== endOfWeek.getMonth()) {
        return `${monthNameShort[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${monthNameShort[endOfWeek.getMonth()]} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
    } 
    // If week spans two years
    else if (startOfWeek.getFullYear() !== endOfWeek.getFullYear()) {
        return `${monthNameShort[startOfWeek.getMonth()]} ${startOfWeek.getDate()}, ${startOfWeek.getFullYear()} - ${monthNameShort[endOfWeek.getMonth()]} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
    }
    // Same month and year
    else {
        return `${monthNameArr[startOfWeek.getMonth()]} ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    }
}

// Run initialization
init();

