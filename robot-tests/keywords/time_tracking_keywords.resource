*** Settings ***
Documentation     Keywords for time tracking functionality
Resource          ../resources/common.resource
Resource          ../resources/locators/time_tracking_locators.resource
Library           Browser
Library           DateTime

*** Variables ***
${DESCRIPTION}          Test time entry
${INVALID_PASSWORD}     wrongpassword123
${TEST_PROJECT}         Fantastic Gold Shirt
${TEST_TASK}           hack monitor
${DROPDOWN_TIMEOUT}    20s

*** Keywords ***
# All your existing keywords go here
Open Employee Time Tracking Page And Wait
    [Documentation]    Opens browser, navigates to time tracking page and waits for all elements
    New Browser       browser=${BROWSER}    headless=${HEADLESS}
    New Page         ${SITE_URL}/EmployeeLogin
    Fill Text        input#email1    ${EMPLOYEE_EMAIL}
    Fill Text        input#password1    ${EMPLOYEE_PASSWORD}
    Click           button:has-text("Sign In")
    Wait For Elements State    xpath=//h1[contains(text(),"Time Tracking")]    visible    timeout=${TIMEOUT}
    Wait For Elements State    [data-test="project-dropdown"]    visible    timeout=${DROPDOWN_TIMEOUT}
    Wait For Elements State    [data-test="project-dropdown"]    enabled    timeout=${DROPDOWN_TIMEOUT}
    Wait For Elements State    [data-test="task-dropdown"]    visible    timeout=${DROPDOWN_TIMEOUT}
    Wait For Elements State    [data-test="task-dropdown"]    enabled    timeout=${DROPDOWN_TIMEOUT}

Select Project And Task
    [Arguments]    ${project_name}    ${task_name}
    Wait For Elements State    [data-test="project-dropdown"]    enabled    timeout=${DROPDOWN_TIMEOUT}
    Click    [data-test="project-dropdown"]
    Wait For Elements State    .p-select-overlay    visible    timeout=${DROPDOWN_TIMEOUT}
    Click    .p-select-overlay .p-select-option-label >> text="${project_name}"
    Wait For Elements State    [data-test="task-dropdown"]    enabled    timeout=${DROPDOWN_TIMEOUT}
    Click    [data-test="task-dropdown"]
    Wait For Elements State    .p-select-overlay    visible    timeout=${DROPDOWN_TIMEOUT}
    Click    .p-select-overlay .p-select-option-label >> text="${task_name}"

Start Time Tracking
    [Documentation]    Starts time tracking with given description
    [Arguments]    ${description}=${DESCRIPTION}
    Fill Text    css=.input-group input    ${description}
    Click    [data-test="timer-button"]:has-text("Start Tracking")
    Wait For Elements State    .current-timer .p-tag:has-text("Active")    visible    timeout=${TIMEOUT}

Pause Time Tracking
    [Documentation]    Pauses current time tracking session
    Click    [data-test="timer-button"]:has-text("Pause")
    Wait For Elements State    .current-timer .p-tag:has-text("Paused")    visible    timeout=${TIMEOUT}

Resume Time Tracking
    [Documentation]    Resumes paused time tracking session
    Click    [data-test="timer-button"]:has-text("Resume")
    Wait For Elements State    .current-timer .p-tag:has-text("Active")    visible    timeout=${TIMEOUT}

Stop Time Tracking
    [Documentation]    Stops current time tracking session
    Click    button:has-text("Stop")
    Wait For Elements State    .current-timer .p-tag:has-text("Ready")    visible    timeout=${TIMEOUT}

Verify Time Entry In Table
    [Arguments]    ${description}    ${project_name}    ${task_name}
    ${entry_xpath}=    Set Variable    xpath=(//tr[td[1]/span[@class="task-name" and text()="${task_name}"] and td[1]/span[@class="project-name" and text()="${project_name}"] and td[4]/span[@title="${description}"]])[1]
    Wait For Elements State    ${entry_xpath}    visible    timeout=15s
    ${text}=    Get Text    ${entry_xpath}
    Should Contain    ${text}    ${description.split('_')[0]}
    Should Match Regexp    ${text}    \\d{1,2}[hms]\\s?\\d{0,2}[m]?\\s?\\d{0,2}[s]?

Table Should Have Entry
    [Arguments]    ${description}    ${project_name}    ${task_name}
    ${xpath}=    Set Variable    xpath=//tr[td[1]/span[@class="task-name" and text()="${task_name}"] and td[1]/span[@class="project-name" and text()="${project_name}"] and td[4]/span[@title="${description}"]]
    Wait For Elements State    ${xpath}    visible    timeout=15s
    ${count}=    Get Element Count    ${xpath}
    Should Be True    ${count} == 1    Expected 1 matching entry, found ${count}

Delete Time Entry
    [Arguments]    ${description}    ${password}=${EMPLOYEE_PASSWORD}
    # Select the first matching row using [1] in XPath
    ${row_xpath}=    Set Variable    xpath=(//tr[td[1]/span[@class="task-name" and text()="${TEST_TASK}"] and td[1]/span[@class="project-name" and text()="${TEST_PROJECT}"] and td[4]/span[@title="${description}"]])[1]
    Wait For Elements State    ${row_xpath}//button[contains(@class,"p-button-danger")]    enabled    timeout=15s
    Click    ${row_xpath}//button[contains(@class,"p-button-danger")]
    
    # Wait for password input and enter password
    Wait For Elements State    [data-test="password-confirm-input"]    visible    timeout=10s
    Fill Text    [data-test="password-confirm-input"]    ${password}
    Click    [data-test="confirm-delete-button"]
    
    # Wait for either success (element detached) or error message
    ${status}=    Run Keyword And Return Status    Wait For Elements State    ${row_xpath}    detached    timeout=5s
    
    IF    not ${status}    RETURN    ${False}
    RETURN    ${True}

Select PrimeVue Dropdown Option With Retry
    [Arguments]    ${dropdown_selector}    ${option_text}    ${retries}=3
    Wait For Elements State    ${dropdown_selector}    enabled    timeout=${DROPDOWN_TIMEOUT}
    FOR    ${i}    IN RANGE    ${retries}
        Click    ${dropdown_selector}
        ${status}=    Run Keyword And Return Status    Wait For Elements State    .p-select-overlay    visible    5s
        Exit For Loop If    ${status}
        Sleep    1s
    END
    Click    .p-select-overlay .p-select-option-label >> text="${option_text}"

Generate Unique Description
    [Arguments]    ${base_description}
    ${timestamp}=    Get Time    epoch    
    RETURN    ${base_description}_${timestamp}

Cleanup Time Entries
    [Documentation]    Deletes all time entries for cleanup
    ${entries}=    Get Elements    xpath=//tr[.//button[contains(@class,"p-button-danger")]]
    FOR    ${entry}    IN    @{entries}
        Click    ${entry}//button[contains(@class,"p-button-danger")]
        Wait For Elements State    [data-test="password-confirm-input"]    visible    timeout=${TIMEOUT}
        Fill Text    [data-test="password-confirm-input"]    ${EMPLOYEE_PASSWORD}
        Click    [data-test="confirm-delete-button"]
        Sleep    1s
    END