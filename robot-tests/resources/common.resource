*** Settings ***
Library    Browser
Library    BuiltIn

*** Variables ***
${BROWSER}              chromium
${HEADLESS}             ${True}
${SITE_URL}             http://localhost:5173
${VALID_EMAIL}          admin@example.com
${VALID_PASSWORD}       admin123

*** Keywords ***
Open Browser To Login Page
    New Browser    browser=${BROWSER}    headless=${HEADLESS}
    New Context    viewport={'width': 1920, 'height': 1080}
    New Page    ${SITE_URL}
    
Login With Credentials
    [Arguments]    ${email}    ${password}
    Fill Text    [data-test="email-input"]    ${email}
    Fill Text    [data-test="password-input"]    ${password}
    Click    button:has-text("Sign In")