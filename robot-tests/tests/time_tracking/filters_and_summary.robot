*** Settings ***
Documentation     Tests for time tracking filters and summary features
Resource          ../../keywords/time_tracking_keywords.resource
Test Setup       Open Employee Time Tracking Page And Wait
Test Teardown    Close Browser

*** Test Cases ***
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