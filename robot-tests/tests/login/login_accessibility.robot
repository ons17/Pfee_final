*** Settings ***
Documentation     Accessibility Test Suite for Login Page
Resource          ../../resources/common.resource
Test Setup        Open Browser To Login Page
Test Teardown     Close Browser

*** Test Cases ***
ARIA Labels Test
    [Documentation]    Verifies ARIA labels are present
    [Tags]    accessibility    aria
    Get Attribute    input#email1    aria-label    ==    Email
    Get Attribute    .p-password input    aria-label    ==    Password