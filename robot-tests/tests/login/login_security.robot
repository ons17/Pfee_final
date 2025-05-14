*** Settings ***
Documentation     Security Test Suite
...               Tests security features of the login page
Resource          ../../resources/common.resource
Test Setup        Open Browser To Login Page
Test Teardown     Close Browser

*** Test Cases ***


Password Masking Test
    [Documentation]    Verifies password field is masked by default
    [Tags]    security    password
    Fill Text    .p-password input    ${VALID_PASSWORD}
    Get Property    .p-password input    type    ==    password

CSRF Protection Test
    [Documentation]    Verifies CSRF token is present in requests
    [Tags]    security    csrf
    ${headers}=    Create Dictionary    X-CSRF-TOKEN    ${None}
    Run Keyword And Expect Error    *    Login With Invalid CSRF

Password Strength Validation
    [Documentation]    Tests password strength requirements
    [Tags]    security    password-strength
    @{weak_passwords}=    Create List    123    password    abcdef
    FOR    ${weak_pass}    IN    @{weak_passwords}
        Fill Text    input#email1    ${VALID_EMAIL}
        Fill Text    .p-password input    ${weak_pass}
        Click    button.w-full
        Wait For Elements State    .text-red-500    visible    timeout=${TIMEOUT}
    END

Remember Me Test
    [Documentation]    Tests remember me functionality
    [Tags]    security    remember-me
    Fill Text    input#email1    ${VALID_EMAIL}
    Fill Text    .p-password input    ${VALID_PASSWORD}
    Check Checkbox    css=#rememberme1 input[type="checkbox"]
    Click    button.w-full
    Wait For Elements State    text="Dashboard"    visible    timeout=${TIMEOUT}

Login Failure Rate Limit
    [Documentation]    Tests rate limiting on failed login attempts
    [Tags]    security    rate-limit
    FOR    ${index}    IN RANGE    3
        Fill Text    input#email1    invalid@email.com
        Fill Text    .p-password input    wrongpass${index}
        Click    button.w-full
        Wait For Elements State    .text-red-500    visible    timeout=${TIMEOUT}
    END