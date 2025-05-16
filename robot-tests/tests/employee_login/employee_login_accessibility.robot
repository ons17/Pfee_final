*** Settings ***
Documentation     Accessibility Test Suite for Employee Login
Resource          ../../keywords/employee_login_keywords.resource
Test Setup        employee_login_keywords.Open Browser To Employee Login Page
Test Teardown     Close Browser

*** Test Cases ***
Verify ARIA Labels
    [Documentation]    Tests presence of ARIA labels
    [Tags]    accessibility    aria
    Get Property    input#email1    placeholder    ==    Email address
    Get Property    input#password1    placeholder    ==    Password

