*** Settings ***
Documentation     Tests for filtering and exporting time entries
Resource          ../../keywords/time_tracking_keywords.resource    
Test Setup       Open Employee Time Tracking Page And Wait
Test Teardown    Close Browser

*** Test Cases ***
Filter By Different Time Periods
    [Documentation]    Tests all time period filter options
    [Tags]    time_tracking    filter    comprehensive
    # Test Day filter
    Click    .filter-dropdown
    Click    :text("Day")
    Get Text    .period-range    matches    \\w+ \\d{2}, \\d{4}
    
    # Test Week filter
    Click    .filter-dropdown
    Click    :text("Week")
    Get Text    .period-range    matches    \\w+ \\d{2} - \\w+ \\d{2}, \\d{4}
    
    # Test Month filter
    Click    .filter-dropdown
    Click    :text("Month")
    Get Text    .period-range    matches    \\w+ \\d{4}

Export Time Entries
    [Documentation]    Tests CSV export functionality
    [Tags]    time_tracking    export
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${unique_desc}=    Generate Unique Description    Export test
    Start Time Tracking    ${unique_desc}
    Sleep    2s
    Stop Time Tracking
    
    # Verify export button is enabled
    Wait For Elements State    button:has-text("Export to CSV")    enabled    timeout=${TIMEOUT}
    Click    button:has-text("Export to CSV")
    Sleep    6s

    # Note: Can't verify file download in browser automation