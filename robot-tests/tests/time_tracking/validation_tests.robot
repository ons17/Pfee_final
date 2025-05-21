*** Settings ***
Documentation     Tests for time tracking input validation
Resource          ../../keywords/time_tracking_keywords.resource    
Test Setup       Open Employee Time Tracking Page And Wait
Test Teardown    Close Browser

*** Test Cases ***
Start Without Project Selection
    [Documentation]    Tests validation when starting without project
    [Tags]    time_tracking    validation    negative
    Wait For Elements State    [data-test="timer-button"]:has-text("Start Tracking")    disabled    timeout=${TIMEOUT}

Start With Empty Description
    [Documentation]    Tests that time tracking can start with empty description
    [Tags]    time_tracking    validation    positive
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    Click    [data-test="timer-button"]:has-text("Start Tracking")    left
    Wait For Elements State    .current-timer .p-tag:has-text("Active")    visible    timeout=${TIMEOUT}
    Sleep    2s
    Stop Time Tracking
    Wait For Elements State    .current-timer .p-tag:has-text("Ready")    visible    timeout=${TIMEOUT}