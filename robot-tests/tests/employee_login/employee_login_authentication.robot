*** Settings ***
Documentation     Authentication Test Suite for Employee Login Page
...               Tests various employee login scenarios and authentication flows
Resource          ../../keywords/employee_login_keywords.resource
Test Setup        employee_login_keywords.Open Browser To Employee Login Page
Test Teardown     Close Browser

*** Test Cases ***
Valid Employee Login
    [Documentation]    Tests successful employee login with valid credentials
    [Tags]    authentication    smoke    critical
    Input Employee Credentials    ${EMPLOYEE_EMAIL}    ${EMPLOYEE_PASSWORD}
    Submit Employee Login Form
    Wait For Elements State    text="Dashboard"    visible    timeout=${TIMEOUT}

Invalid Employee Login - Wrong Password
    [Documentation]    Tests employee login failure with incorrect password
    [Tags]    authentication    negative
    Input Employee Credentials    ${EMPLOYEE_EMAIL}    wrongpassword
    Submit Employee Login Form
    Wait For Elements State    text="Login failed. Please try again."    visible    timeout=${TIMEOUT}

Invalid Employee Login - Wrong Email
    [Documentation]    Tests employee login failure with incorrect email
    [Tags]    authentication    negative
    Input Employee Credentials    invalid@email.com    ${EMPLOYEE_PASSWORD}
    Submit Employee Login Form
    Wait For Elements State    text="Login failed. Please try again."    visible    timeout=${TIMEOUT}

Remember Me Employee Login
    [Documentation]    Tests employee login with remember me functionality
    [Tags]    authentication    remember-me
    Input Employee Credentials    ${EMPLOYEE_EMAIL}    ${EMPLOYEE_PASSWORD}
    Check Checkbox    ${REMEMBER_ME_CB}
    Submit Employee Login Form
    Wait For Elements State    text="Dashboard"    visible    timeout=${TIMEOUT}
    

    
Multiple Failed Login Attempts
    [Documentation]    Tests behavior with multiple failed attempts
    [Tags]    authentication    security
    FOR    ${index}    IN RANGE    3
        Input Employee Credentials    ${EMPLOYEE_EMAIL}    wrong${index}
        Submit Employee Login Form
        employee_login_keywords.Wait For Employee Error Message    Login failed. Please try again.
    END

*** Keywords ***
Verify Employee Login Success
    [Documentation]    Verifies successful login state
    Wait For Elements State    ${DASHBOARD_TEXT}    visible    timeout=${TIMEOUT}
    ${token}=    Get Local Storage Item    token
    Should Not Be Empty    ${token}
    ${employee}=    Get Local Storage Item    employee
    Should Not Be Empty    ${employee}