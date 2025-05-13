*** Settings ***
Resource          resources/common.resource
Test Setup        Open Browser To Login Page
Test Teardown     Close Browser

*** Test Cases ***
Valid Login
    Login With Credentials    ${VALID_EMAIL}    ${VALID_PASSWORD}
    Wait For Elements State    text=Dashboard    visible    timeout=10s

Invalid Login
    Login With Credentials    invalid@email.com    wrongpassword
    Wait For Elements State    text="Invalid credentials"    visible    timeout=10s