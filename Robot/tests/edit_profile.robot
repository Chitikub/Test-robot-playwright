*** Settings ***
Documentation     US-09: การแก้ไขข้อมูลโปรไฟล์
Library           SeleniumLibrary
Library           OperatingSystem
Suite Setup       Initialize Suite
Suite Teardown    Close All Browsers
Test Teardown     Reset Session State

*** Variables ***
${BASE_URL}       https://moodlocation.vercel.app
${USER_EMAIL}     iamgodjikk@gmail.com
${USER_PASS}      @Iamgodji254704

# Valid JPEG asset is kept as a checked-in file and reused instead of overwriting it with a broken base64 payload.

# Locators
${FIRSTNAME_INPUT}    xpath=//label[contains(text(),'ชื่อ')]/..//input
${LASTNAME_INPUT}     xpath=//label[contains(text(),'นามสกุล')]/..//input
${GENDER_SELECT}      xpath=//label[contains(text(),'เพศ')]/..//select
${FILE_INPUT}          xpath=//input[@type='file']
${SAVE_BTN}           xpath=//button[contains(text(),'บันทึกการเปลี่ยนแปลง')]

*** Keywords ***
Initialize Suite
    Create Test Assets
    Open Browser To Login Page

Create Test Assets
    [Documentation]    สร้างไฟล์ตัวอย่างสำหรับทดสอบ โดยไม่รี-สร้างรูปภาพที่เก็บใน repo แล้ว
    Create Directory    ${CURDIR}/assets
    File Should Exist   ${CURDIR}/assets/valid_image.jpg
    Create File         ${CURDIR}/assets/script.exe         fake_exe_bytes
    Evaluate            open(r'${CURDIR}/assets/large_11mb_image.jpg', 'wb').write(b'0' * (11 * 1024 * 1024))

Open Browser To Login Page
    Open Browser    about:blank    chrome    options=page_load_strategy="normal"
    Maximize Browser Window

Reset Session State
    Delete All Cookies
    Execute Javascript    window.localStorage.clear(); window.sessionStorage.clear();

Dismiss SweetAlert If Present
    ${is_present}=    Run Keyword And Return Status    Wait Until Element Is Visible    css:.swal2-confirm    timeout=3s
    IF    ${is_present}
        Run Keyword And Ignore Error    Click Element    css:.swal2-confirm
        Wait Until Element Is Not Visible    css:.swal2-container    timeout=5s
    END

Verify SweetAlert Popup And Confirm
    [Arguments]    ${expected_text}    ${timeout}=25s
    [Documentation]    รอจนกว่า Alert จะแสดงข้อความผลลัพธ์ และปิดได้ทั้งกรณีมีปุ่ม OK หรือไม่
    Wait Until Element Is Visible    css:.swal2-popup    timeout=${timeout}
    ${popup_text}=    Get Text    css:.swal2-popup
    Should Contain    ${popup_text}    ${expected_text}

    ${confirm_present}=    Run Keyword And Return Status    Wait Until Element Is Visible    css:.swal2-confirm    timeout=5s
    IF    ${confirm_present}
        Click Element    css:.swal2-confirm
        Wait Until Element Is Not Visible    css:.swal2-container    timeout=10s
    ELSE
        Run Keyword And Ignore Error    Execute Javascript    if (document.querySelector('.swal2-confirm')) { document.querySelector('.swal2-confirm').click(); }
        Run Keyword And Ignore Error    Press Keys    css:.swal2-popup    ESC
        Run Keyword And Ignore Error    Wait Until Element Is Not Visible    css:.swal2-container    timeout=10s
    END

Clear React Input Field
    [Arguments]    ${locator}
    Wait Until Element Is Visible    ${locator}    timeout=10s
    Wait Until Element Is Enabled    ${locator}    timeout=10s
    Scroll Element Into View         ${locator}
    Click Element                    ${locator}
    Press Keys                       ${locator}    CTRL+a    BACKSPACE

Login And Navigate To Profile
    Go To    ${BASE_URL}
    Reset Session State
    Reload Page
    
    # 1. เข้าสู่ระบบ
    Wait Until Element Is Visible    xpath=//a[contains(text(),'เข้าสู่ระบบ')]    timeout=10s
    Wait Until Element Is Enabled    xpath=//a[contains(text(),'เข้าสู่ระบบ')]    timeout=10s
    Click Element                    xpath=//a[contains(text(),'เข้าสู่ระบบ')]
    
    Wait Until Element Is Visible    xpath=//input[@type='email' or contains(@placeholder, 'mail')]    timeout=10s
    Wait Until Element Is Enabled    xpath=//input[@type='email' or contains(@placeholder, 'mail')]    timeout=10s
    Input Text                       xpath=//input[@type='email' or contains(@placeholder, 'mail')]    ${USER_EMAIL}
    Input Text                       xpath=//input[@type='password']    ${USER_PASS}
    Click Button                     xpath=//form//button[contains(text(),'เข้าสู่ระบบ')]
    
    # 2. ปิด Alert ล็อกอินสำเร็จ และรอให้ Backdrop หายไปสนิท
    Dismiss SweetAlert If Present

    # 3. ไปหน้า Profile
    Wait Until Element Is Visible    css:i.bi-list, .hamburger-icon    timeout=10s
    Wait Until Element Is Enabled    css:i.bi-list, .hamburger-icon    timeout=10s
    Click Element                    css:i.bi-list, .hamburger-icon
    
    Wait Until Element Is Visible    xpath=//a[contains(text(),'โปรไฟล์ของฉัน')]    timeout=10s
    Wait Until Element Is Enabled    xpath=//a[contains(text(),'โปรไฟล์ของฉัน')]    timeout=10s
    Click Element                    xpath=//a[contains(text(),'โปรไฟล์ของฉัน')]
    
    # รอจนกว่าช่องกรอกข้อมูลและปุ่มบันทึกพร้อมโต้ตอบ
    Wait Until Page Contains Element    ${SAVE_BTN}          timeout=10s
    Wait Until Element Is Visible       ${FIRSTNAME_INPUT}   timeout=10s
    Wait Until Element Is Enabled       ${FIRSTNAME_INPUT}   timeout=10s

*** Test Cases ***
TC_9_0_001_Edit_Profile_Partial_Success
    [Documentation]    แก้ไขข้อมูลโปรไฟล์บางช่องสำเร็จ
    Login And Navigate To Profile
    Clear React Input Field    ${FIRSTNAME_INPUT}
    Input Text                 ${FIRSTNAME_INPUT}    Chitipat
    Click Button               ${SAVE_BTN}
    Verify SweetAlert Popup And Confirm    อัปเดตข้อมูลเรียบร้อย!    timeout=25s

TC_9_0_002_Edit_Profile_All_Fields_Success
    [Documentation]    แก้ไขข้อมูลโปรไฟล์ทุกช่องสำเร็จ
    Login And Navigate To Profile
    Clear React Input Field    ${FIRSTNAME_INPUT}
    Input Text                 ${FIRSTNAME_INPUT}    Chitipat
    Clear React Input Field    ${LASTNAME_INPUT}
    Input Text                 ${LASTNAME_INPUT}     Churhor
    Select From List By Value   ${GENDER_SELECT}      male
    Click Button               ${SAVE_BTN}
    Verify SweetAlert Popup And Confirm    อัปเดตข้อมูลเรียบร้อย!    timeout=25s

TC_9_0_003_Change_Profile_Image_Success
    [Documentation]    เปลี่ยนรูปโปรไฟล์สำเร็จ
    Login And Navigate To Profile
    Choose File    ${FILE_INPUT}    ${CURDIR}/assets/valid_image.jpg
    Sleep          1s
    Click Button   ${SAVE_BTN}
    Verify SweetAlert Popup And Confirm    อัปเดตข้อมูลเรียบร้อย!    timeout=25s

TC_9_0_004_Invalid_Or_Incomplete_Profile_Data
    [Documentation]    กรอกข้อมูลโปรไฟล์ไม่ถูกต้องหรือไม่ครบถ้วน
    Login And Navigate To Profile
    Clear React Input Field    ${FIRSTNAME_INPUT}
    Click Button               ${SAVE_BTN}
    Wait Until Element Is Visible    css:.swal2-popup    timeout=5s
    Dismiss SweetAlert If Present

TC_9_0_005_Upload_Invalid_File_Type
    [Documentation]    อัปโหลดไฟล์ที่ไม่ใช่รูปภาพ (เช่น .exe)
    Login And Navigate To Profile
    Choose File    ${FILE_INPUT}    ${CURDIR}/assets/script.exe
    Verify SweetAlert Popup And Confirm    ประเภทไฟล์ไม่ถูกต้อง

TC_9_0_006_Upload_Image_Over_5MB
    [Documentation]    อัปโหลดไฟล์รูปภาพขนาดเกิน 5 MB
    Login And Navigate To Profile
    Choose File    ${FILE_INPUT}    ${CURDIR}/assets/large_11mb_image.jpg
    Verify SweetAlert Popup And Confirm    ไฟล์ใหญ่เกินไป!