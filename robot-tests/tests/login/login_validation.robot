*** Settings ***
Documentation     Form Validation Test Suite
...               Tests input validation and error handling
Resource          ../../keywords/login_keywords.resource
Test Setup        Open Browser To Login Page
Test Teardown     Close Browser

*** Test Cases ***
Empty Form Submission
    [Documentation]    Tests submission with empty form
    [Tags]    validation    negative
    Click    button.w-full    # Updated selector
    Wait For Elements State    .text-red-500    visible    timeout=${TIMEOUT}

Invalid Email Format
    [Documentation]    Tests email format validation
    [Tags]    validation    email
    Fill Text    input#email1    invalid-email
    Fill Text    .p-password input    ${VALID_PASSWORD}
    Click    button.w-full
    Wait For Elements State    .text-red-500    visible    timeout=${TIMEOUT}

Multiple Failed Login Attempts
    [Documentation]    Tests behavior with multiple failed attempts
    [Tags]    validation    security
    FOR    ${index}    IN RANGE    3
        Fill Text    input#email1    invalid@email.com
        Fill Text    .p-password input    wrongpass${index}
        Click    button.w-full
        Wait For Elements State    .text-red-500    visible    timeout=${TIMEOUT}
    END

Email Field Validation
    [Documentation]    Tests email field validation
    [Tags]    validation    email
    Open Browser To Login Page
    # Empty email
    Fill Text    input#email1    ${EMPTY}
    Fill Text    .p-password input    ${VALID_PASSWORD}
    Click    "Sign In"
    Wait For Elements State    .text-red-500    visible
    
    # Invalid email format
    Fill Text    input#email1    invalid-email
    Click    "Sign In"
    Wait For Elements State    .text-red-500    visible

Password Field Validation
    [Documentation]    Tests password field validation
    [Tags]    validation    password
    Open Browser To Login Page
    Fill Text    input#email1    ${VALID_EMAIL}
    Fill Text    .p-password input    short
    Click    "Sign In"
    Wait For Elements State    .text-red-500    visible

XSS Prevention Test
    [Documentation]    Tests XSS prevention in input fields
    Fill Text    input#email1    <script>alert('xss')</script>
    Fill Text    .p-password input    ${VALID_PASSWORD}
    Click    button.w-full
    Wait For Elements State    .text-red-500    visible

SQL Injection Prevention Test
    [Documentation]    Tests SQL injection prevention
    @{sql_injections}=    Create List
    ...    ' OR '1'='1
    ...    ' OR 1=1;--
    ...    '; DROP TABLE Administrateur;--
    FOR    ${injection}    IN    @{sql_injections}
        Fill Text    input#email1    ${injection}
        Fill Text    .p-password input    ${VALID_PASSWORD}
        Click    button.w-full
        Wait For Elements State    .text-red-500    visible
    END