*** Settings ***
Documentation     Tests for concurrent time tracking sessions
Resource          ../../keywords/time_tracking_keywords.resource    
Test Setup       Open Employee Time Tracking Page And Wait
Test Teardown    Close Browser

*** Test Cases ***
Prevent Multiple Active Sessions
    [Documentation]    Tests that user cannot start multiple tracking sessions
    [Tags]    time_tracking    concurrent    negative
    
    # Start first session
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${unique_desc1}=    Generate Unique Description    First session
    Start Time Tracking    ${unique_desc1}
    Sleep    2s
    
    # Verify timer is active
    Wait For Elements State    ${STATUS_ACTIVE}    visible    timeout=${TIMEOUT}
    
    # Verify Start button is not visible during active session
    ${start_visible}=    Get Element States    ${TIMER_BUTTON}:has-text("Start Tracking")
    Should Not Contain    ${start_visible}    visible
    
    # Verify Pause button is visible
    Wait For Elements State    ${TIMER_BUTTON}:has-text("Pause")    visible    timeout=${TIMEOUT}
    
    # Verify project and task dropdowns have disabled class/attribute
    ${project_disabled}=    Get Element    ${PROJECT_DROPDOWN}
    ${project_class}=    Get Property    ${project_disabled}    className
    Should Contain    ${project_class}    p-disabled

    ${task_disabled}=    Get Element    ${TASK_DROPDOWN}
    ${task_class}=    Get Property    ${task_disabled}    className
    Should Contain    ${task_class}    p-disabled
    
    Take Screenshot    active-session-controls
    
    # Clean up
    Click    button:has-text("Stop")
    Wait For Elements State    ${STATUS_READY}    visible    timeout=${TIMEOUT}
    Verify Time Entry In Table    ${unique_desc1}    ${TEST_PROJECT}    ${TEST_TASK}