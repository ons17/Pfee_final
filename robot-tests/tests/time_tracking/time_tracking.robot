*** Settings ***
Documentation     Time Tracking Test Suite
...               Tests the time tracking functionality including starting, pausing,
...               stopping and managing time entries.

Resource          ../../resources/common.resource
Library           Browser
Library           DateTime
Test Setup        Open Employee Time Tracking Page
Test Teardown     Close Browser

*** Variables ***
${DESCRIPTION}          Test time entry
${INVALID_PASSWORD}     wrongpassword123
${TEST_PROJECT}         rrrrrrrrrrrrrrrrrrrr
${TEST_TASK}            rrrrrr

*** Keywords ***
Open Employee Time Tracking Page
    [Documentation]    Opens browser and navigates to the time tracking page
    New Browser       browser=${BROWSER}    headless=${HEADLESS}
    New Page         ${SITE_URL}/EmployeeLogin
    Fill Text        input#email1    ${EMPLOYEE_EMAIL}
    Fill Text        input#password1    ${EMPLOYEE_PASSWORD}
    Click           button:has-text("Sign In")
    Wait For Elements State    xpath=//h1[contains(text(),"Time Tracking")]    visible    timeout=${TIMEOUT}

Select Project And Task
    [Documentation]    Selects a project and task from dropdowns
    [Arguments]    ${project_name}    ${task_name}
    Click    [data-test="project-dropdown"]
    Wait For Elements State    .p-dropdown-panel    visible    timeout=${TIMEOUT}
    Click    .p-dropdown-panel .p-select-option-label >> text="${project_name}"
    Click    [data-test="task-dropdown"]
    Wait For Elements State    .p-dropdown-panel    visible    timeout=${TIMEOUT}
    Click    .p-dropdown-panel .p-select-option-label >> text="${task_name}"

Start Time Tracking
    [Documentation]    Starts time tracking with given description
    [Arguments]    ${description}=${DESCRIPTION}
    Fill Text    css=.input-group input    ${description}
    Click    [data-test="timer-button"]:has-text("Start Tracking")
    Wait For Elements State    .timer-status-badge:has-text("Active")    visible    timeout=${TIMEOUT}

Pause Time Tracking
    [Documentation]    Pauses current time tracking session
    Click    [data-test="timer-button"]:has-text("Pause")
    Wait For Elements State    .timer-status-badge:has-text("Paused")    visible    timeout=${TIMEOUT}

Resume Time Tracking
    [Documentation]    Resumes paused time tracking session
    Click    [data-test="timer-button"]:has-text("Resume")
    Wait For Elements State    .timer-status-badge:has-text("Active")    visible    timeout=${TIMEOUT}

Stop Time Tracking
    [Documentation]    Stops current time tracking session
    Click    button:has-text("Stop")
    Wait For Elements State    [data-test="timer-button"]:has-text("Start Tracking")    visible    timeout=${TIMEOUT}

Verify Time Entry In Table
    [Documentation]    Verifies time entry appears in the table with correct details
    [Arguments]    ${description}    ${project_name}    ${task_name}
    Wait For Elements State    .time-entries    visible    timeout=${TIMEOUT}
    ${entry_exists}=    Get Element    xpath=//td[contains(text(),'${description}')]
    Should Not Be Empty    ${entry_exists}
    Get Text    xpath=//td[contains(.,'${task_name}')]//span[@class='project-name']    ==    ${project_name}

Delete Time Entry
    [Documentation]    Deletes a time entry with confirmation
    [Arguments]    ${description}    ${password}=${EMPLOYEE_PASSWORD}
    Click    xpath=//td[contains(text(),'${description}')]/..//button[contains(@class,'p-button-danger')]
    Wait For Elements State    [data-test="password-confirm-input"]    visible    timeout=${TIMEOUT}
    Fill Text    [data-test="password-confirm-input"]    ${password}
    Click    [data-test="confirm-delete-button"]
    Wait For Elements State    .p-toast-message-success    visible    timeout=${TIMEOUT}

*** Test Cases ***
Start And Stop Time Tracking
    [Documentation]    Tests basic time tracking functionality
    [Tags]    time_tracking    smoke
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    Start Time Tracking
    Sleep    3s    # Wait to accumulate some time
    Stop Time Tracking
    Verify Time Entry In Table    ${DESCRIPTION}    ${TEST_PROJECT}    ${TEST_TASK}

Pause And Resume Time Tracking
    [Documentation]    Tests pausing and resuming time tracking
    [Tags]    time_tracking    pause_resume
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    Start Time Tracking    Pause test entry
    Sleep    2s
    Pause Time Tracking
    Sleep    1s
    Resume Time Tracking
    Sleep    2s
    Stop Time Tracking
    Verify Time Entry In Table    Pause test entry    ${TEST_PROJECT}    ${TEST_TASK}

Delete Time Entry
    [Documentation]    Tests deleting a time entry
    [Tags]    time_tracking    delete
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    Start Time Tracking    Entry to delete
    Sleep    2s
    Stop Time Tracking
    Delete Time Entry    Entry to delete
    
Invalid Delete Password
    [Documentation]    Tests delete validation with invalid password
    [Tags]    time_tracking    delete    negative
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    Start Time Tracking    Invalid delete test
    Sleep    2s
    Stop Time Tracking
    Click    xpath=//td[contains(text(),'Invalid delete test')]/..//button[contains(@class,'p-button-danger')]
    Wait For Elements State    [data-test="password-confirm-input"]    visible
    Fill Text    [data-test="password-confirm-input"]    ${INVALID_PASSWORD}
    Click    [data-test="confirm-delete-button"]
    Wait For Elements State    .p-toast-message-error    visible

Change Time Period Filter
    [Documentation]    Tests time period filter functionality
    [Tags]    time_tracking    filter
    Click    .filter-dropdown
    Click    :text("Day")
    Get Text    .period-range    matches    \\w+ \\d{2}, \\d{4}
    Click    .filter-dropdown
    Click    :text("Week")
    Get Text    .period-range    matches    \\w+ \\d{2} - \\w+ \\d{2}, \\d{4}

Verify Weekly Summary
    [Documentation]    Tests weekly summary display
    [Tags]    time_tracking    summary
    Wait For Elements State    .weekly-summary    visible
    ${summary_visible}=    Get Element    .weekly-progress-bar
    Should Not Be Empty    ${summary_visible}
    ${hours_visible}=    Get Element    .summary-badge
    Should Not Be Empty    ${hours_visible}