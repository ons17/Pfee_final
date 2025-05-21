*** Variables ***
# Timer controls
${TIMER_BUTTON}              [data-test="timer-button"]
${TIMER_DISPLAY}             [data-test="timer-display"]
${DESCRIPTION_INPUT}         css=.input-group input

# Dropdowns
${PROJECT_DROPDOWN}          [data-test="project-dropdown"]
${TASK_DROPDOWN}            [data-test="task-dropdown"]

# Table elements
${TIME_ENTRIES_TABLE}        [data-test="time-entries-table"]
${DELETE_BUTTON}             button[contains(@class,"p-button-danger")]
${PASSWORD_INPUT}            [data-test="password-confirm-input"]
${CONFIRM_DELETE_BUTTON}     [data-test="confirm-delete-button"]

# Status indicators
${STATUS_READY}             .current-timer .p-tag:has-text("Ready")
${STATUS_ACTIVE}            .current-timer .p-tag:has-text("Active")
${STATUS_PAUSED}            .current-timer .p-tag:has-text("Paused")