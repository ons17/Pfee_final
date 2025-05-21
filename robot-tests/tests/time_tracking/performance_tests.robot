*** Settings ***
Documentation     Performance and boundary tests for time tracking
Resource          ../../keywords/time_tracking_keywords.resource    
Test Setup       Open Employee Time Tracking Page And Wait
Test Teardown    Close Browser

*** Test Cases ***
Long Duration Time Tracking
    [Documentation]    Tests time tracking for longer duration (5 minutes)
    [Tags]    time_tracking    performance    long_duration
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${unique_desc}=    Generate Unique Description    Long duration test
    Start Time Tracking    ${unique_desc}
    Sleep    300s    # 5 minutes
    Stop Time Tracking
    Verify Time Entry In Table    ${unique_desc}    ${TEST_PROJECT}    ${TEST_TASK}

Multiple Pause Resume Cycles
    [Documentation]    Tests multiple pause/resume cycles in one session
    [Tags]    time_tracking    performance    stress
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${unique_desc}=    Generate Unique Description    Multiple pause test
    Start Time Tracking    ${unique_desc}
    
    FOR    ${i}    IN RANGE    5
        Sleep    2s
        Pause Time Tracking
        Sleep    1s
        Resume Time Tracking
    END
    
    Stop Time Tracking
    Verify Time Entry In Table    ${unique_desc}    ${TEST_PROJECT}    ${TEST_TASK}