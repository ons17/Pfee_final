*** Settings ***
Documentation     Navigation Test Suite for Employee Login
...               Tests navigation and routing after employee login
Resource          ../../keywords/employee_login_keywords.resource
Test Setup        employee_login_keywords.Open Browser To Employee Login Page
Test Teardown     Close Browser

*** Test Cases ***
Successful Employee Login Navigation
    [Documentation]    Tests navigation to dashboard after successful employee login
    [Tags]    routing    navigation
    Input Employee Credentials    ${EMPLOYEE_EMAIL}    ${EMPLOYEE_PASSWORD}
    Submit Employee Login Form
    Wait For Elements State    text="Dashboard"    visible    timeout=${TIMEOUT}
    Get Url    ==    ${SITE_URL}/app    # Updated based on router config for employees

Unauthorized Employee Access Prevention
    [Documentation]    Tests prevention of unauthorized employee dashboard access
    [Tags]    security    routing
    # Start fresh browser session
    New Browser    browser=${BROWSER}    headless=${HEADLESS}
    New Context    viewport={'width': 1920, 'height': 1080}
    
    # Try accessing protected route directly
    New Page    ${SITE_URL}/app
    
    # Wait and verify redirection without using Wait For Navigation
    ${redirected_url}=    Get Url
    Wait Until Keyword Succeeds    10s    1s    Should Contain    ${redirected_url}    /login
    
    # Additional verification of login page load
    
    # Final URL verification
    ${final_url}=    Get Url
    Should Be Equal    ${final_url}    ${SITE_URL}/login

Direct Login Page Access
    [Documentation]    Tests direct access to login page
    [Tags]    routing    access
    # Create new context to avoid conflicts
    New Context
    New Page    ${SITE_URL}/EmployeeLogin
    Wait For Elements State    img[alt="Logo"]    visible    timeout=${TIMEOUT}

