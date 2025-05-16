*** Settings ***
Documentation     Navigation Test Suite
...               Tests navigation and routing after login
Resource          ../../keywords/login_keywords.resource

*** Test Cases ***
Successful Login Navigation
    [Documentation]    Tests navigation to dashboard after successful login
    [Tags]    routing    navigation
    Open Browser To Login Page
    Login With Credentials    ${VALID_EMAIL}    ${VALID_PASSWORD}
    Submit Login Form
    Wait For Elements State    text="Dashboard"    visible    timeout=${TIMEOUT}
    Get Url    ==    ${SITE_URL}/app    # Updated to match router config

Unauthorized Access Prevention
    [Documentation]    Tests prevention of unauthorized dashboard access
    [Tags]    security    routing
    Open Browser To Login Page
    Clear Browser Storage
    Go To    ${SITE_URL}/app
    Get Url    ==    ${SITE_URL}/login    # Updated to match router config