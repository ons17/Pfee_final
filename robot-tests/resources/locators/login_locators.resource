*** Variables ***
# Input Fields
${EMAIL_INPUT}             input#email1
${PASSWORD_INPUT}          .p-password input
${PASSWORD_TOGGLE}         .p-password svg.p-password-toggle-mask-icon

# Buttons
${SIGNIN_BUTTON}          button.w-full    # Updated selector for Sign In button
${GOOGLE_BUTTON}          \#google-signin-button

# Checkboxes
${REMEMBER_ME_CB}         css=#rememberme1 input[type="checkbox"]

# Text Elements
${OR_TEXT}               text="OR"
${EMAIL_LABEL}           label[for="email1"]
${PASSWORD_LABEL}        label[for="password1"]
${REMEMBER_LABEL}        label[for="rememberme1"]

# Logo
${LOGO_IMG}             img[alt="Logo"]