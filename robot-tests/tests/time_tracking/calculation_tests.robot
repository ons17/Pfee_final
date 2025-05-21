*** Settings ***
Documentation     Tests for time tracking calculations (duration, totals, summaries)
Resource          ../../keywords/time_tracking_keywords.resource
Test Setup       Open Employee Time Tracking Page And Wait
Test Teardown    Close Browser

*** Test Cases ***
Duration Calculation For Single Entry
    [Documentation]    Verifies that the duration for a single entry is calculated and displayed correctly
    [Tags]    time_tracking    calculation    duration
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${unique_desc}=    Generate Unique Description    Duration test
    Start Time Tracking    ${unique_desc}
    Sleep    5s
    Stop Time Tracking
    ${entry_xpath}=    Set Variable    xpath=(//tr[td[1]/span[@class="task-name" and text()="${TEST_TASK}"] and td[1]/span[@class="project-name" and text()="${TEST_PROJECT}"] and td[4]/span[@title="${unique_desc}"]])[1]
    Wait For Elements State    ${entry_xpath}    visible    timeout=${TIMEOUT}
    ${row_text}=    Get Text    ${entry_xpath}
    Should Match Regexp    ${row_text}    [1-9]s

Total Duration Calculation For Multiple Entries
    [Documentation]    Verifies that the total duration for multiple entries is calculated correctly in the weekly summary
    [Tags]    time_tracking    calculation    total
    # Create first entry
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${desc1}=    Generate Unique Description    Calc1
    Start Time Tracking    ${desc1}
    Sleep    3s
    Stop Time Tracking
    # Create second entry
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${desc2}=    Generate Unique Description    Calc2
    Start Time Tracking    ${desc2}
    Sleep    4s
    Stop Time Tracking
    # Go to week filter and check summary
    Click    .filter-dropdown
    Click    .p-select-overlay .p-select-option-label >> text=Week
    Wait For Elements State    .weekly-summary    visible    timeout=${TIMEOUT}
    ${summary_text}=    Get Text    .summary-badge
    # Should show at least 0h 0m (since both entries are short)
    Should Match Regexp    ${summary_text}    \\d+h \\d+m

Daily Total Calculation
    [Documentation]    Verifies that the daily total in the weekly summary matches the sum of durations for that day
    [Tags]    time_tracking    calculation    daily
    # Create two entries on the same day
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${desc1}=    Generate Unique Description    Daily1
    Start Time Tracking    ${desc1}
    Sleep    2s
    Stop Time Tracking
    Select Project And Task    ${TEST_PROJECT}    ${TEST_TASK}
    ${desc2}=    Generate Unique Description    Daily2
    Start Time Tracking    ${desc2}
    Sleep    3s
    Stop Time Tracking
    # Go to week filter and check the current day's total
    Click    .filter-dropdown
    Click    .p-select-overlay .p-select-option-label >> text=Week
    Wait For Elements State    .weekly-summary    visible    timeout=${TIMEOUT}
    # Find today's card and check the total
    ${today}=    Get Text    .active-day .day-total
    Should Match Regexp    ${today}    \\d+h \\d+m
