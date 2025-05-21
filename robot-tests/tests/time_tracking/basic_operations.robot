*** Settings ***
Documentation     Tests for basic time tracking operations
Resource          ../../keywords/time_tracking_keywords.resource
Test Setup       Open Employee Time Tracking Page And Wait
Test Teardown    Close Browser

*** Test Cases ***
Start And Stop Time Tracking
    [Documentation]    Tests basic time tracking functionality
    [Tags]    time_tracking    smoke
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${unique_desc}=    Generate Unique Description    Test time entry
    Start Time Tracking    ${unique_desc}
    Sleep    50s    # Wait to accumulate some time
    Stop Time Tracking
    Wait For Elements State    .current-timer .p-tag:has-text("Ready")    visible    timeout=${TIMEOUT}
    Verify Time Entry In Table    ${unique_desc}    ${TEST_PROJECT}    ${TEST_TASK}

Pause And Resume Time Tracking
    [Documentation]    Tests pausing and resuming time tracking
    [Tags]    time_tracking    pause_resume
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${unique_desc}=    Generate Unique Description    Pause test entry
    Start Time Tracking    ${unique_desc}
    Sleep    3s    # Wait before pausing
    
    # Pause tracking
    Wait For Elements State    [data-test="timer-button"]:has-text("Pause")    visible    timeout=${TIMEOUT}
    Click    [data-test="timer-button"]:has-text("Pause")
    Wait For Elements State    .current-timer .p-tag:has-text("Paused")    visible    timeout=${TIMEOUT}
    Sleep    2s
    
    # Resume tracking
    Wait For Elements State    [data-test="timer-button"]:has-text("Resume")    visible    timeout=${TIMEOUT}
    Click    [data-test="timer-button"]:has-text("Resume")
    Wait For Elements State    .current-timer .p-tag:has-text("Active")    visible    timeout=${TIMEOUT}
    Sleep    2s
    
    Stop Time Tracking
    Verify Time Entry In Table    ${unique_desc}    ${TEST_PROJECT}    ${TEST_TASK}
