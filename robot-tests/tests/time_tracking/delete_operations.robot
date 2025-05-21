*** Settings ***
Documentation     Tests for time entry deletion operations
Resource          ../../keywords/time_tracking_keywords.resource
Test Setup       Open Employee Time Tracking Page And Wait
Test Teardown    Close Browser

*** Test Cases ***
Delete Time Entry
    [Documentation]    Tests deleting a time entry
    [Tags]    time_tracking    delete
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${unique_desc}=    Generate Unique Description    Entry to delete
    Start Time Tracking    ${unique_desc}
    Sleep    3s
    Stop Time Tracking

    # Wait for entry to appear
    ${entry_xpath}=    Set Variable    xpath=(//tr[td[1]/span[@class="task-name" and text()="${TEST_TASK}"] and td[1]/span[@class="project-name" and text()="${TEST_PROJECT}"] and td[4]/span[@title="${unique_desc}"]])[1]
    Wait For Elements State    ${entry_xpath}    visible    timeout=${TIMEOUT}

    # Attempt to delete the entry
    Click    ${entry_xpath}//button[contains(@class,"p-button-danger")]
    Wait For Elements State    [data-test="password-confirm-input"]    visible    timeout=${TIMEOUT}
    Fill Text    [data-test="password-confirm-input"]    ${EMPLOYEE_PASSWORD}
    Click    [data-test="confirm-delete-button"]

    Sleep    1s

    # Verify entry with unique_desc is no longer present (deleted)
    Wait For Elements State    ${entry_xpath}    detached    timeout=${TIMEOUT}
    Take Screenshot

Invalid Delete Password
    [Documentation]    Tests delete validation with invalid password
    [Tags]    time_tracking    delete    negative
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${unique_desc}=    Generate Unique Description    Invalid delete test
    Start Time Tracking    ${unique_desc}
    Sleep    3s
    Stop Time Tracking
    
    # Wait for entry and attempt delete with invalid password
    ${entry_xpath}=    Set Variable    xpath=(//tr[td[1]/span[@class="task-name" and text()="${TEST_TASK}"] and td[1]/span[@class="project-name" and text()="${TEST_PROJECT}"] and td[4]/span[@title="${unique_desc}"]])[1]
    Wait For Elements State    ${entry_xpath}    visible    timeout=${TIMEOUT}
    Click    ${entry_xpath}//button[contains(@class,"p-button-danger")]
    
    # Enter invalid password and attempt delete
    Wait For Elements State    [data-test="password-confirm-input"]    visible    timeout=${TIMEOUT}
    Fill Text    [data-test="password-confirm-input"]    ${INVALID_PASSWORD}
    Click    [data-test="confirm-delete-button"]

    Sleep    1s

    # Verify entry with unique_desc is still present (not deleted)
    Wait For Elements State    ${entry_xpath}    visible    timeout=${TIMEOUT}
    ${row_text}=    Get Text    ${entry_xpath}
    Should Contain    ${row_text}    ${unique_desc}
    Take Screenshot