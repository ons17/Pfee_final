*** Settings ***
Documentation     Authentication Test Suite for Login Page
...               Tests various login scenarios and authentication flows
Resource          ../../keywords/login_keywords.resource
Test Setup        Open Browser To Login Page
Test Teardown     Close Browser

*** Test Cases ***
Valid Login
    [Documentation]    Tests successful login with valid credentials
    [Tags]    authentication    smoke    critical
    Input Login Credentials    ${VALID_EMAIL}    ${VALID_PASSWORD}
    Submit Login Form
    Wait For Elements State    text="Dashboard"    visible    timeout=${TIMEOUT}

Invalid Login - Wrong Password
    [Documentation]    Tests login failure with incorrect password
    [Tags]    authentication    negative
    Input Login Credentials    ${VALID_EMAIL}    wrongpassword
    Submit Login Form
    Wait For Elements State    text="Email ou mot de passe incorrect"    visible    timeout=${TIMEOUT}

Invalid Login - Wrong Email
    [Documentation]    Tests login failure with incorrect email
    [Tags]    authentication    negative
    Input Login Credentials    invalid@email.com    ${VALID_PASSWORD}
    Submit Login Form
    Wait For Elements State    text="Email ou mot de passe incorrect"    visible    timeout=${TIMEOUT}

Remember Me Login
    [Documentation]    Tests login with remember me functionality
    [Tags]    authentication    remember-me
    Input Login Credentials    ${VALID_EMAIL}    ${VALID_PASSWORD}
    Check Checkbox    ${REMEMBER_ME_CB}
    Submit Login Form
    Wait For Elements State    text="Dashboard"    visible    timeout=${TIMEOUT}