// app.js

document.addEventListener('DOMContentLoaded', () => {
    // === Variables & Elements ===
    const currentDatetimeEl = document.getElementById('current-datetime');
    const currentYearEl = document.getElementById('current-year');
    currentYearEl.textContent = new Date().getFullYear();

    // Export Print functions to window level to allow onclick attributes to work
    window.printAll = function() {
        document.body.className = 'print-all text-slate-800 antialiased min-h-screen flex flex-col relative overflow-x-hidden';
        window.print();
        setTimeout(() => document.body.className = 'text-slate-800 antialiased min-h-screen flex flex-col relative overflow-x-hidden', 500);
    };

    window.printSpecificTable = function(tableId) {
        document.body.className = `print-${tableId} text-slate-800 antialiased min-h-screen flex flex-col relative overflow-x-hidden`;
        window.print();
        setTimeout(() => document.body.className = 'text-slate-800 antialiased min-h-screen flex flex-col relative overflow-x-hidden', 500);
    };

    window.printReportCard = function(officeName) {
        document.getElementById('print-office-concerned').textContent = officeName || '_____________________';
        document.body.className = 'print-all print-report text-slate-800 antialiased min-h-screen flex flex-col relative overflow-x-hidden';
        window.print();
        setTimeout(() => document.body.className = 'text-slate-800 antialiased min-h-screen flex flex-col relative overflow-x-hidden', 550);
    };

    window.sendReportToService = async function(reportType) {
        const client = await getSupabaseClient();
        if (!client) {
            showToast('Unable to connect to database.', 'error');
            return;
        }

        const { data: accounts } = await client.from('office_accounts')
                                               .select('office_name, email')
                                               .order('office_name', { ascending: true });
        
        let inputOptions = {};

        if (typeof formConfig !== 'undefined' && Array.isArray(formConfig.recipients)) {
            formConfig.recipients.forEach(r => {
                const parts = r.split('|');
                if (parts.length >= 2) {
                    inputOptions[parts[1].trim()] = `${parts[0].trim()} (${parts[1].trim()})`;
                } else if (r.trim() !== '') {
                    inputOptions[r.trim()] = r.trim();
                }
            });
        }

        if (Object.keys(inputOptions).length === 0) {
            inputOptions["qa@bisu.edu.ph"] = "Campus Quality Assurance Service (qa@bisu.edu.ph)";
        }

        if (accounts && accounts.length > 0) {
            accounts.forEach(acc => {
                inputOptions[acc.email] = `${acc.office_name} (${acc.email})`;
            });
        }

        Swal.fire({
            title: `Send ${reportType}?`,
            html: `Select the destination to send the <b>"${reportType}"</b>:`,
            iconHtml: '<div class="w-16 h-16 bg-blue-50 text-bisu-blue rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-blue-100"><i class="fa-solid fa-paper-plane text-2xl"></i></div>',
            customClass: {
                icon: 'border-0 mb-0 w-full',
                popup: 'rounded-3xl shadow-2xl font-sans pb-4 border border-slate-100',
                title: 'text-2xl font-black text-slate-800 tracking-tight mt-2',
                htmlContainer: 'text-slate-500 font-medium mt-2 mb-6 text-sm',
                input: 'w-[90%] mx-auto bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-xl focus:ring-0 focus:border-bisu-blue block p-3.5 shadow-sm transition-colors outline-none cursor-pointer',
                actions: 'w-full flex justify-center gap-3 mt-6',
                confirmButton: 'bg-bisu-blue hover:bg-blue-900 text-white font-bold rounded-xl px-8 py-3.5 shadow-md transition-all w-full max-w-[160px] flex items-center justify-center gap-2',
                cancelButton: 'bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl px-8 py-3.5 transition-all border border-slate-200 w-full max-w-[150px] shadow-sm',
            },
            buttonsStyling: false,
            input: 'select',
            inputOptions: inputOptions,
            inputPlaceholder: 'Select recipient...',
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-paper-plane"></i> Send',
            cancelButtonText: 'Cancel',
            inputValidator: (value) => {
                return new Promise((resolve) => {
                    if (value !== '') {
                        resolve();
                    } else {
                        resolve('You need to select a destination.');
                    }
                });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const selectedDestination = result.value === 'QA' ? 'Campus Quality Assurance Service' : result.value;
                showToast(`Submitting ${reportType} to ${selectedDestination}...`, 'info');
                setTimeout(() => {
                    showToast(`${reportType} successfully sent to ${selectedDestination}.`, 'success');
                }, 1500);
            }
        });
    };

    // Views
    const privacyModal = document.getElementById('privacy-modal');
    const viewFeedback = document.getElementById('view-feedback');
    const viewComplaint = document.getElementById('view-complaint');
    const viewAdmin = document.getElementById('view-admin');

    // Admin Login Modal
    const adminLoginModal = document.getElementById('admin-login-modal');
    const closeLoginBtn = document.getElementById('close-login-btn');
    const adminLoginForm = document.getElementById('admin-login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const submitLoginBtn = document.getElementById('submit-login-btn');

    // Admin Account Management Modal
    const manageAccountsBtn = document.getElementById('manage-accounts-btn');
    const manageAccountsModal = document.getElementById('manage-accounts-modal');
    const closeAccountsBtn = document.getElementById('close-accounts-btn');
    const officeAccountForm = document.getElementById('office-account-form');
    const accOfficeSelect = document.getElementById('acc-office');
    const accEmailInput = document.getElementById('acc-email');
    const accPasswordInput = document.getElementById('acc-password');
    const submitAccBtn = document.getElementById('submit-acc-btn');
    const accountsTableBody = document.getElementById('accounts-table-body');
    const settingsBtn = document.getElementById('admin-settings-btn');

    // Manage Recipients Modal
    const manageRecipientsBtn = document.getElementById('manage-recipients-btn');
    const manageRecipientsModal = document.getElementById('manage-recipients-modal');
    const closeRecipientsBtn = document.getElementById('close-recipients-btn');
    const saveRecipientsBtn = document.getElementById('save-recipients-btn');
    const configRecipientsList = document.getElementById('config-recipients-list');
    const addRecipientBtn = document.getElementById('add-recipient-btn');
    
    let tempRecipients = [];
    
    function renderRecipientsList() {
        if (!configRecipientsList) return;
        configRecipientsList.innerHTML = '';
        tempRecipients.forEach((recip, idx) => {
            const div = document.createElement('div');
            div.className = 'bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm relative';
            div.innerHTML = `
                <button type="button" class="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition" onclick="removeTempRecipient(${idx})" title="Remove"><i class="fa-solid fa-trash"></i></button>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mr-6">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Office / Title</label>
                        <input type="text" value="${recip.name}" onchange="updateTempRecipient(${idx}, 'name', this.value)" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-bisu-blue focus:ring-1 focus:ring-bisu-blue outline-none transition-shadow bg-white" placeholder="e.g. Quality Assurance">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                        <input type="email" value="${recip.email}" onchange="updateTempRecipient(${idx}, 'email', this.value)" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-bisu-blue focus:ring-1 focus:ring-bisu-blue outline-none transition-shadow bg-white" placeholder="e.g. qa@bisu.edu.ph">
                    </div>
                </div>
            `;
            configRecipientsList.appendChild(div);
        });
        
        if (tempRecipients.length === 0) {
            configRecipientsList.innerHTML = '<div class="text-center py-6 text-slate-400 italic text-sm">No custom recipients added.</div>';
        }
    }

    if (addRecipientBtn) {
        addRecipientBtn.addEventListener('click', () => {
            tempRecipients.push({ name: '', email: '' });
            renderRecipientsList();
            setTimeout(() => {
                const list = configRecipientsList;
                if(list) list.scrollTop = list.scrollHeight;
            }, 50);
        });
    }

    window.updateTempRecipient = function(idx, field, val) {
        tempRecipients[idx][field] = val;
    };

    window.removeTempRecipient = function(idx) {
        tempRecipients.splice(idx, 1);
        renderRecipientsList();
    };

    // Consent
    const consentCheckbox = document.getElementById('consent-checkbox');
    const acceptConsentBtn = document.getElementById('accept-consent-btn');

    const toggleComplaintBtn = document.getElementById('toggle-complaint-btn');
    const backToFeedbackBtn = document.getElementById('back-to-feedback-btn');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const logoutAdminBtn = document.getElementById('logout-admin-btn');
    
    // Forms
    const feedbackForm = document.getElementById('feedback-form');
    const complaintForm = document.getElementById('complaint-form');

    // State Variables
    // currentRatings is defined dynamically below

    // === Translations ===
    let currentLang = 'en';

    const translations = {
        en: {
            "t-header-sub": "Calape Campus - Customer Satisfaction",
            "t-modal-title": "Data Privacy Act Consent",
            "t-modal-desc": "In accordance with the Data Privacy Act of 2012, we ensure that your personal data is protected. The information gathered will be used solely for evaluating and improving our services.",
            "t-modal-check": "I agree to the terms and authorize BISU to process my feedback.",
            "t-modal-btn": "Proceed to Form",
            "t-fb-title": "Feedback Form",
            "t-fb-office": `Office Visited <span class="text-red-500">*</span>`,
            "t-sel-office": "Select Office",
            "t-fb-service": `Service Availed <span class="text-red-500">*</span>`,
            "t-fb-type": `Client Type <span class="text-red-500">*</span>`,
            "t-sel-type": "Select Type",
            "t-type-stu": "Student",
            "t-type-fac": "Faculty",
            "t-type-cit": "Citizen",
            "t-type-bus": "Business",
            "t-type-gov": "Government",
            "t-fb-sex": "Sex (Optional)",
            "t-sel-sex": "Select Sex",
            "t-sex-m": "Male",
            "t-sex-f": "Female",
            "t-sex-o": "Prefer not to say",
            "t-fb-inst-strong": "Rating Scale:",
            "t-fb-vs1": "Very Satisfied",
            "t-fb-neu": "Neutral",
            "t-fb-vd1": "Very Dissatisfied",
            "t-fb-commend": "Commendations (Optional)",
            "t-fb-suggest": "Suggestions (Optional)",
            "t-fb-comp-link": "File a Formal Complaint instead",
            "t-fb-submit": "Submit Feedback",
            "t-cp-title": "Formal Complaint Form",
            "t-cp-back": "Back",
            "t-cp-desc": "This form is given to any client experiencing dissatisfaction. Data is handled with strict confidentiality per the Data Privacy Act.",
            "t-cp-h1": "Details of Complainant (Optional for anonymity)",
            "t-cp-name": "Name",
            "t-cp-contact": "Contact Details",
            "t-cp-h2": "Complaint Details",
            "t-cp-date": `Date of Incident <span class="text-red-500">*</span>`,
            "t-cp-place": `Place of Incident <span class="text-red-500">*</span>`,
            "t-cp-act": `Act/s Complained of / Details <span class="text-red-500">*</span>`,
            "t-cp-narr": `Narrative Report <span class="text-red-500">*</span>`,
            "t-cp-out": `Desired Outcome <span class="text-red-500">*</span>`,
            "t-cp-bind": "I bind myself to stand on the truth of this complaint on behalf of the public and the institution.",
            "t-cp-submit": "Submit Complaint"
        },
        tl: {
            "t-header-sub": "Kampus ng Calape - Kasiyahan ng Kostumer",
            "t-modal-title": "Pahintulot sa Data Privacy Act",
            "t-modal-desc": "Alinsunod sa Data Privacy Act ng 2012, tinitiyak namin na protektado ang iyong personal na data. Ang impormasyong nakalap ay gagamitin lamang para sa pagtatasa at pagpapabuti ng aming mga serbisyo.",
            "t-modal-check": "Sumasang-ayon ako sa mga tuntunin at pinahihintulutan ang BISU na iproseso ang aking feedback.",
            "t-modal-btn": "Magpatuloy sa Form",
            "t-fb-title": "Form ng Feedback",
            "t-fb-office": `Opisinang Binisita <span class="text-red-500">*</span>`,
            "t-sel-office": "Pumili ng Opisina",
            "t-fb-service": `Serbisyong Nakuha <span class="text-red-500">*</span>`,
            "t-fb-type": `Uri ng Kliyente <span class="text-red-500">*</span>`,
            "t-sel-type": "Pumili ng Uri",
            "t-type-stu": "Estudyante",
            "t-type-fac": "Guro",
            "t-type-cit": "Mamamayan",
            "t-type-bus": "Negosyo",
            "t-type-gov": "Gobyerno",
            "t-fb-sex": "Kasarian (Opsyonal)",
            "t-sel-sex": "Pumili ng Kasarian",
            "t-sex-m": "Lalaki",
            "t-sex-f": "Babae",
            "t-sex-o": "Mas piniling hindi sabihin",
            "t-fb-inst-strong": "Sukat ng Pag-rate:",
            "t-fb-vs1": "Lubos na Nasiyahan",
            "t-fb-neu": "Neutral",
            "t-fb-vd1": "Lubos na Hindi Nasiyahan",
            "t-fb-commend": "Papuri (Opsyonal)",
            "t-fb-suggest": "Mungkahi (Opsyonal)",
            "t-fb-comp-link": "Maghain ng Pormal na Reklamo",
            "t-fb-submit": "Isumite ang Feedback",
            "t-cp-title": "Pormal na Form ng Reklamo",
            "t-cp-back": "Bumalik",
            "t-cp-desc": "Ang form na ito ay ibinibigay sa sinumang kliyente na nakakaranas ng hindi kasiyahan. Ang data ay hahawakan nang may mahigpit na pagiging lihim base sa Data Privacy Act.",
            "t-cp-h1": "Mga Detalye ng Nagrereklamo (Opsyonal para hindi makilala)",
            "t-cp-name": "Pangalan",
            "t-cp-contact": "Mga Detalye sa Pakikipag-ugnayan",
            "t-cp-h2": "Mga Detalye ng Reklamo",
            "t-cp-date": `Petsa ng Insidente <span class="text-red-500">*</span>`,
            "t-cp-place": `Lugar ng Insidente <span class="text-red-500">*</span>`,
            "t-cp-act": `Gawaing Inirereklamo <span class="text-red-500">*</span>`,
            "t-cp-narr": `Salaysay na Ulat <span class="text-red-500">*</span>`,
            "t-cp-out": `Nais na Kalabasan <span class="text-red-500">*</span>`,
            "t-cp-bind": "Tinatali ko ang aking sarili na panindigan ang katotohanan ng reklamong ito.",
            "t-cp-submit": "Isumite ang Reklamo"
        },
        ceb: {
            "t-header-sub": "Kampus sa Calape - Katagbawan sa Kustomer",
            "t-modal-title": "Pagtugot sa Data Privacy Act",
            "t-modal-desc": "Nahiuyon sa Data Privacy Act sa 2012, among gipaninguha nga protektado ang imong personal nga datos. Ang impormasyon pagagamiton para lang sa pagpalambo sa serbisyo.",
            "t-modal-check": "Miuyon ako sa mga kondisyon ug gitugotan ang BISU sa pagproseso sa akong feedback.",
            "t-modal-btn": "Ipadayon sa Porma",
            "t-fb-title": "Porma sa Feedback",
            "t-fb-office": `Opisina nga Gibisita <span class="text-red-500">*</span>`,
            "t-sel-office": "Pagpili og Opisina",
            "t-fb-service": `Serbisyo nga Nakuha <span class="text-red-500">*</span>`,
            "t-fb-type": `Klase sa Kliyente <span class="text-red-500">*</span>`,
            "t-sel-type": "Pagpili og Klase",
            "t-type-stu": "Estudyante",
            "t-type-fac": "Magtutudlo",
            "t-type-cit": "Lungsoranon",
            "t-type-bus": "Pamatigayon",
            "t-type-gov": "Gobyerno",
            "t-fb-sex": "Sekso (Opsiyonal)",
            "t-sel-sex": "Pagpili og Sekso",
            "t-sex-m": "Lalaki",
            "t-sex-f": "Babaye",
            "t-sex-o": "Mas gipili nga dili isulti",
            "t-fb-inst-strong": "Sukdanan sa Rating:",
            "t-fb-vs1": "Kontento Kaayo",
            "t-fb-neu": "Neyutral",
            "t-fb-vd1": "Dili Kontento Kaayo",
            "t-fb-commend": "Pagdayeg (Opsiyonal)",
            "t-fb-suggest": "Suhisyon (Opsiyonal)",
            "t-fb-comp-link": "Pag-file og Pormal nga Reklamo",
            "t-fb-submit": "I-sumiter ang Feedback",
            "t-cp-title": "Pormal nga Porma sa Reklamo",
            "t-cp-back": "Balik",
            "t-cp-desc": "Kini nga porma gihatag ngadto sa bisan kinsa nga kliyente nga nakasinati og pagkadili kontento. Ang datos atimanon uban ang higpit nga kompidensiyalidad basi sa Data Privacy Act.",
            "t-cp-h1": "Mga Detalye sa Reklamante (Pwede dili magpaila)",
            "t-cp-name": "Pangalan",
            "t-cp-contact": "Contact Details",
            "t-cp-h2": "Mga Detalye sa Reklamo",
            "t-cp-date": `Adlaw sa Insidente <span class="text-red-500">*</span>`,
            "t-cp-place": `Lugar sa Insidente <span class="text-red-500">*</span>`,
            "t-cp-act": `Aksyon nga Gireklamo <span class="text-red-500">*</span>`,
            "t-cp-narr": `Naratibong Report <span class="text-red-500">*</span>`,
            "t-cp-out": `Gitinguha nga Resulta <span class="text-red-500">*</span>`,
            "t-cp-bind": "Gibarugan nako ang kamatuoran niining reklamo alang sa publiko ug institusyon.",
            "t-cp-submit": "I-sumiter ang Reklamo"
        }
    };

    const defaultDimensions = {
        en: [
            { id: 'responsiveness', icon: 'fa-bolt', label: '1. Responsiveness', desc: 'Willingness to help, assist, and provide prompt service.' },
            { id: 'reliability', icon: 'fa-shield-halved', label: '2. Reliability (Quality)', desc: 'Provision of what is needed and what was promised.' },
            { id: 'access_facilities', icon: 'fa-building', label: '3. Access & Facilities', desc: 'Convenience of location, ample amenities, and clean space.' },
            { id: 'communication', icon: 'fa-comments', label: '4. Communication', desc: 'Act of keeping citizens and clients informed in a language they can easily understand.' },
            { id: 'costs', icon: 'fa-wallet', label: '5. Costs', desc: 'Satisfaction with timeliness of the billing, fair value, etc.' },
            { id: 'integrity', icon: 'fa-scale-balanced', label: '6. Integrity', desc: 'Honesty, justice, fairness, and trust in the service.' },
            { id: 'assurance', icon: 'fa-handshake', label: '7. Assurance', desc: 'Capability of frontline staff to perform their duties with courtesy.' },
            { id: 'outcome', icon: 'fa-bullseye', label: '8. Outcome', desc: 'Extent of achieving outcomes or realizing the intended benefits.' }
        ],
        tl: [
            { id: 'responsiveness', icon: 'fa-bolt', label: '1. Pagtugon (Responsiveness)', desc: 'Kusang loob na tumulong at magbigay ng mabilis na serbisyo.' },
            { id: 'reliability', icon: 'fa-shield-halved', label: '2. Kaaasahan (Reliability)', desc: 'Pagbibigay ng kung ano ang kinakailangan at ipinangako.' },
            { id: 'access_facilities', icon: 'fa-building', label: '3. Pasilidad at Access', desc: 'Kaginhawaan sa lokasyon at malinis na espasyo.' },
            { id: 'communication', icon: 'fa-comments', label: '4. Komunikasyon', desc: 'Pagpapanatiling may alam ang mga kliyente sa wikang madaling maintindihan.' },
            { id: 'costs', icon: 'fa-wallet', label: '5. Gastos', desc: 'Kasiyahan sa halaga, oras ng pagsingil, atbp.' },
            { id: 'integrity', icon: 'fa-scale-balanced', label: '6. Integridad (Integrity)', desc: 'Katapatan, katarungan, at tiwala sa serbisyo.' },
            { id: 'assurance', icon: 'fa-handshake', label: '7. Kasiguruhan (Assurance)', desc: 'Kakayahan ng mga kawani na gampanan ang tungkulin nang may paggalang.' },
            { id: 'outcome', icon: 'fa-bullseye', label: '8. Kinalabasan (Outcome)', desc: 'Lawak ng pagkamit ng mga inaasahang benepisyo.' }
        ],
        ceb: [
            { id: 'responsiveness', icon: 'fa-bolt', label: '1. Pagtubag (Responsiveness)', desc: 'Kadasig sa pag-abag ug paghatag og paspas nga serbisyo.' },
            { id: 'reliability', icon: 'fa-shield-halved', label: '2. Kasaligan (Reliability)', desc: 'Paghatag unsa ang gikinahanglan ug unsa ang gisaad.' },
            { id: 'access_facilities', icon: 'fa-building', label: '3. Pasilidad ug Access', desc: 'Kasayon sa lokasyon ug komportable nga lugar.' },
            { id: 'communication', icon: 'fa-comments', label: '4. Komunikasyon', desc: 'Ang pagpahibalo sa impormasyon ngadto sa kliyente pinaagi sa dali masabtan nga pinulongan.' },
            { id: 'costs', icon: 'fa-wallet', label: '5. Gasto', desc: 'Pagkakontento sa pangayo ug uban pa.' },
            { id: 'integrity', icon: 'fa-scale-balanced', label: '6. Integridad (Integrity)', desc: 'Pagkamatinud-anon ug pagkamakatarunganon sa serbisyo.' },
            { id: 'assurance', icon: 'fa-handshake', label: '7. Kasigurohan (Assurance)', desc: 'Kahanas sa mga kawani sa pagbuhat sa ilang trabaho uban ang tahod.' },
            { id: 'outcome', icon: 'fa-bullseye', label: '8. Resulta (Outcome)', desc: 'Ang gidak-on sa nakamit nga gipaabot nga kaayohan.' }
        ]
    };

    const ratingValues = [
        { value: 1, text: '1', label: 'Very Dissatisfied', colorClass: 'hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50' },
        { value: 2, text: '2', label: 'Dissatisfied', colorClass: 'hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50' },
        { value: 3, text: '3', label: 'Neutral', colorClass: 'hover:border-slate-400 hover:text-slate-600 hover:bg-slate-100' },
        { value: 4, text: '4', label: 'Satisfied', colorClass: 'hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50' },
        { value: 5, text: '5', label: 'Very Satisfied', colorClass: 'hover:border-yellow-400 hover:text-yellow-600 hover:bg-yellow-50' }
    ];

    // === Dynamic Form Config ===
    const getDefaultFormConfig = () => ({
        offices: ["Registrar's Office", "Cashier", "Library", "Clinic", "Guidance Office"],
        recipients: ["Campus Quality Assurance Service | qa@bisu.edu.ph"],
        dimensions: JSON.parse(JSON.stringify(defaultDimensions))
    });

    const normalizeFormConfig = (config) => {
        const normalized = config || {};
        if (!Array.isArray(normalized.offices) || normalized.offices.length === 0) {
            normalized.offices = getDefaultFormConfig().offices;
        }

        if (!Array.isArray(normalized.recipients) || normalized.recipients.length === 0) {
            normalized.recipients = getDefaultFormConfig().recipients;
        }

        if (!normalized.dimensions || typeof normalized.dimensions !== 'object') {
            normalized.dimensions = JSON.parse(JSON.stringify(defaultDimensions));
        }

        ['en', 'tl', 'ceb'].forEach(lang => {
            if (!Array.isArray(normalized.dimensions[lang]) || normalized.dimensions[lang].length === 0) {
                normalized.dimensions[lang] = JSON.parse(JSON.stringify(defaultDimensions[lang]));
            }
        });

        return normalized;
    };

    let formConfig = normalizeFormConfig(JSON.parse(localStorage.getItem('bisuFormConfig')) || getDefaultFormConfig());

    async function getSupabaseClient() {
        if (window.supabaseClient) return window.supabaseClient;
        if (window.supabaseReady) {
            try {
                return await window.supabaseReady;
            } catch (_) {
                return null;
            }
        }
        return null;
    }

    // Canonical Table Names
    const FEEDBACK_TABLE = 'feedbacks';
    const COMPLAIN_TABLE = 'complaints';
    const SETTINGS_TABLE = 'admin_settings';

    function isMissingTableError(error) {
        if (!error) return false;
        const msg = (error.message || '').toLowerCase();
        return error.code === '42P01' || msg.includes('relation') && msg.includes('does not exist');
    }

    async function insertEvaluations(client, rows) {
        // Direct insert into the feedbacks table
        return await client.from(FEEDBACK_TABLE).insert(rows);
    }

    async function selectEvaluations(client) {
        // Directly select from the feedbacks table
        return await client.from(FEEDBACK_TABLE).select('*').order('created_at', { ascending: false });
    }

    async function loadFormConfigFromDatabase() {
        const client = await getSupabaseClient();
        if (!client) return;

        const { data, error } = await client
            .from('admin_settings')
            .select('config')
            .eq('id', 'global_config')
            .maybeSingle();

        if (error) {
            console.error('Failed to load admin settings from Supabase:', error);
            return;
        }

        if (data && data.config) {
            formConfig = normalizeFormConfig(data.config);
            localStorage.setItem('bisuFormConfig', JSON.stringify(formConfig));
        }
    }

    function renderDynamicFields() {
        const officeSelect = document.getElementById('office-visited');
        const reportCardSelect = document.getElementById('office-report-card-select');
        
        const populateSelect = (el) => {
            if(!el) return;
            const originalVal = el.value;
            let defaultText = 'Select Option';
            if (el.id === 'office-visited') defaultText = 'Select Office';
            else if (el.id === 'acc-office') defaultText = 'Select Target Office';
            else if (el.id === 'office-report-card-select') defaultText = 'Select Office for Card';
            
            el.innerHTML = `<option value="">${defaultText}</option>`;
            formConfig.offices.forEach(office => {
                el.innerHTML += `<option value="${office}">${office}</option>`;
            });
            el.value = originalVal;
        };

        populateSelect(officeSelect);
        populateSelect(reportCardSelect);
        populateSelect(accOfficeSelect);
    }

    window.generateOfficeReportCard = function() {
        const office = document.getElementById('office-report-card-select').value;
        if(!office) {
            showToast("Please select an office first.", "error");
            return;
        }
        
        // Temporarily filter the dashboard view to ONLY see this office
        // Instead of complex refetching, we can use CSS to hide other rows
        const rows = document.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const firstCell = row.querySelector('.col-office');
            if(firstCell) {
                const cellText = firstCell.textContent.trim();
                if(cellText !== office && cellText !== 'Overall Rating' && !cellText.includes('No data')) {
                    row.classList.add('hide-for-individual');
                } else {
                    row.classList.remove('hide-for-individual');
                }
            }
        });

        // Add a print rule to hide marked rows
        const style = document.createElement('style');
        style.id = 'temp-print-style';
        style.innerHTML = '@media print { .hide-for-individual { display: none !important; } }';
        document.head.appendChild(style);

        window.printReportCard(office);
        
        // Cleanup after print
        setTimeout(() => {
            rows.forEach(row => row.classList.remove('hide-for-individual'));
            style.remove();
        }, 1000);
    };

    // === Initialization ===

    function updateDateTime() {
        const now = new Date();
        currentDatetimeEl.textContent = now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    let currentRatings = {};

    function renderLikertScales() {
        const container = document.getElementById('dimensions-container');
        container.innerHTML = '';

        let dims = formConfig.dimensions[currentLang] || formConfig.dimensions['en'];
        
        // Reset state tracker exactly to active dimensions
        currentRatings = {};
        dims.forEach(d => currentRatings[d.id] = null);

        dims.forEach(dim => {
            const dimDiv = document.createElement('div');
            dimDiv.className = 'p-4 rounded-xl border border-slate-100 bg-white shadow-sm';
            
            let buttonsHtml = '';
            ratingValues.forEach(e => {
                buttonsHtml += `
                    <button type="button" 
                        class="likert-btn relative flex items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-500 font-bold shadow-sm focus:outline-none w-10 h-10 md:w-12 md:h-12 text-sm md:text-base ${e.colorClass} transition-all duration-300 transform"
                        data-dimension="${dim.id}" data-value="${e.value}" title="${e.label}">
                        ${e.value}
                    </button>
                `;
            });

            dimDiv.innerHTML = `
                <div class="mb-4">
                    <h4 class="font-bold text-bisu-blue flex items-center"><i class="fa-solid ${dim.icon} w-6 text-center mr-2 text-slate-400"></i> ${dim.label} <span class="text-red-500 ml-1">*</span></h4>
                    <p class="text-xs md:text-sm text-slate-500 pl-8">${dim.desc}</p>
                </div>
                <!-- Connecting Line visual trick behind the buttons -->
                <div class="relative px-2 md:px-8">
                    <div class="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full mx-6 md:mx-14 hidden sm:block"></div>
                    <div class="flex justify-between items-center relative z-10 w-full gap-2">
                        ${buttonsHtml}
                    </div>
                </div>
            `;
            container.appendChild(dimDiv);
        });

        // Add event listeners to newly created buttons
        document.querySelectorAll('.likert-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const dim = this.getAttribute('data-dimension');
                const val = parseInt(this.getAttribute('data-value'));
                
                // Update State
                currentRatings[dim] = val;
                
                // Update UI visually
                const parent = this.parentElement;
                parent.querySelectorAll('.likert-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
        
        // Restore active selections visually if re-rendered
        for(let dim in currentRatings){
            if(currentRatings[dim] !== null){
                const btn = document.querySelector(`.likert-btn[data-dimension="${dim}"][data-value="${currentRatings[dim]}"]`);
                if(btn) btn.classList.add('selected');
            }
        }
    }

    async function initializeFormConfig() {
        await loadFormConfigFromDatabase();
        renderDynamicFields();
        renderLikertScales();
    }

    initializeFormConfig();

    function applyTranslations(lang) {
        currentLang = lang;
        const dict = translations[lang];
        for (let key in dict) {
            const el = document.getElementById(key);
            if (el) el.innerHTML = dict[key];
        }
        renderLikertScales();
    }

    const langSelector = document.getElementById('language-selector');
    const langSelectorMobile = document.getElementById('language-selector-mobile');
    
    if(langSelector) {
        langSelector.addEventListener('change', (e) => {
            applyTranslations(e.target.value);
            if(langSelectorMobile) langSelectorMobile.value = e.target.value;
        });
    }
    if(langSelectorMobile) {
        langSelectorMobile.addEventListener('change', (e) => {
            applyTranslations(e.target.value);
            if(langSelector) langSelector.value = e.target.value;
        });
    }

    // === Event Listeners ===

    consentCheckbox.addEventListener('change', (e) => {
        acceptConsentBtn.disabled = !e.target.checked;
    });

    acceptConsentBtn.addEventListener('click', () => {
        privacyModal.classList.add('opacity-0');
        setTimeout(() => {
            privacyModal.style.display = 'none';
            viewFeedback.classList.remove('section-hidden');
        }, 300);
    });

    toggleComplaintBtn.addEventListener('click', () => {
        viewFeedback.classList.add('section-hidden');
        viewComplaint.classList.remove('section-hidden');
        window.scrollTo(0,0);
    });

    backToFeedbackBtn.addEventListener('click', () => {
        viewComplaint.classList.add('section-hidden');
        viewFeedback.classList.remove('section-hidden');
        window.scrollTo(0,0);
    });

    function openAdminView() {
        viewFeedback.classList.add('section-hidden');
        viewComplaint.classList.add('section-hidden');
        privacyModal.style.display = 'none';
        viewAdmin.classList.remove('section-hidden');
    }

    function closeAdminView() {
        viewAdmin.classList.add('section-hidden');
        viewFeedback.classList.remove('section-hidden');
    }

    async function isCurrentUserAdmin(client) {
        const { data: authData, error: authError } = await client.auth.getUser();
        if (authError || !authData?.user) return false;

        const { data: adminData, error: adminError } = await client
            .from('admin_users')
            .select('user_id')
            .eq('user_id', authData.user.id)
            .maybeSingle();

        if (adminError) {
            console.error('Admin verification failed:', adminError);
            return false;
        }

        return !!adminData;
    }

    function openAdminLoginModal() {
        adminLoginModal.classList.remove('hidden');
        adminLoginModal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        setTimeout(() => loginEmailInput.focus(), 100);
    }

    adminLoginBtn.addEventListener('click', openAdminLoginModal);

    // Mobile admin login button
    const adminLoginBtnMobile = document.getElementById('admin-login-btn-mobile');
    if(adminLoginBtnMobile) {
        adminLoginBtnMobile.addEventListener('click', openAdminLoginModal);
    }

    closeLoginBtn.addEventListener('click', () => {
        adminLoginModal.classList.add('hidden');
        adminLoginModal.classList.remove('flex');
        document.body.style.overflow = '';
        adminLoginForm.reset();
    });

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const client = await getSupabaseClient();
        if (!client) {
            showToast('Supabase is not connected. Please check your project keys.', 'error');
            return;
        }

        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;

        submitLoginBtn.disabled = true;
        submitLoginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Logging in...';

        try {
            const { error: signInError } = await client.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) {
                showToast(`Login failed: ${signInError.message}`, 'error');
                return;
            }

            const adminAllowed = await isCurrentUserAdmin(client);
            if (!adminAllowed) {
                await client.auth.signOut();
                showToast('Account is not registered as admin.', 'error');
                return;
            }

            adminLoginModal.classList.add('hidden');
            adminLoginModal.classList.remove('flex');
            document.body.style.overflow = '';
            adminLoginForm.reset();
            openAdminView();
            fetchAdminData();
        } finally {
            submitLoginBtn.disabled = false;
            submitLoginBtn.innerHTML = 'Login to Dashboard';
        }
    });

    if (logoutAdminBtn) {
        logoutAdminBtn.addEventListener('click', async () => {
            const client = await getSupabaseClient();
            if (client) {
                await client.auth.signOut();
            }
            closeAdminView();
        });
    }

    // --- Complaints Modal Logic ---
    const adminComplaintsModal = document.getElementById('admin-complaints-modal');
    const closeComplaintsBtn = document.getElementById('close-complaints-btn');
    const viewComplaintsBtn = document.getElementById('view-complaints-btn');
    
    if (viewComplaintsBtn && adminComplaintsModal) {
        viewComplaintsBtn.addEventListener('click', () => {
            adminComplaintsModal.classList.remove('hidden');
            adminComplaintsModal.classList.add('flex');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeComplaintsBtn && adminComplaintsModal) {
        closeComplaintsBtn.addEventListener('click', () => {
            adminComplaintsModal.classList.add('hidden');
            adminComplaintsModal.classList.remove('flex');
            document.body.style.overflow = '';
        });
    }

    // --- Accounts Management Logic ---

    async function fetchOfficeAccounts() {
        if (!accountsTableBody) return;
        const client = await getSupabaseClient();
        if (!client) return;

        const { data, error } = await client.from('office_accounts').select('*').order('office_name', { ascending: true });
        
        accountsTableBody.innerHTML = '';
        if (error || !data || data.length === 0) {
            accountsTableBody.innerHTML = `<tr><td colspan="3" class="px-4 py-8 text-center text-slate-400 italic">No office accounts registered.</td></tr>`;
            return;
        }

        data.forEach(acc => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-100 last:border-0 hover:bg-slate-50 transition';
            tr.innerHTML = `
                <td class="px-4 py-3 font-semibold text-bisu-blue">${acc.office_name}</td>
                <td class="px-4 py-3">${acc.email}</td>
                <td class="px-4 py-3 text-right">
                    <button onclick="deleteOfficeAccount(${acc.id})" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition">Delete</button>
                </td>
            `;
            accountsTableBody.appendChild(tr);
        });
    }

    if(manageAccountsBtn) {
        manageAccountsBtn.addEventListener('click', () => {
            manageAccountsModal.classList.remove('hidden');
            manageAccountsModal.classList.add('flex');
            document.body.style.overflow = 'hidden';
            fetchOfficeAccounts();
        });
    }

    if(closeAccountsBtn) {
        closeAccountsBtn.addEventListener('click', () => {
            manageAccountsModal.classList.add('hidden');
            manageAccountsModal.classList.remove('flex');
            document.body.style.overflow = '';
            if(officeAccountForm) officeAccountForm.reset();
        });
    }

    if(officeAccountForm) {
        officeAccountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const client = await getSupabaseClient();
            if(!client) return;

            const office = accOfficeSelect.value;
            const email = accEmailInput.value.trim();
            const password = accPasswordInput.value;

            submitAccBtn.disabled = true;
            submitAccBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...';

            try {
                // Try registering the user in Auth
                const { error: signUpError } = await client.auth.signUp({ email, password });
                
                if (signUpError && signUpError.message.toLowerCase().includes("already registered")) {
                    // Try to use a custom RPC to update passwords (since frontend client cannot change other user passwords)
                    const { error: rpcError } = await client.rpc('admin_change_user_password', { target_email: email, new_password: password });
                    if (rpcError) {
                        console.warn('RPC missing or failed:', rpcError);
                        showToast('Notice: Email exists. Could not change password automatically without Supabase backend permissions.', 'warning');
                    } else {
                        showToast('Password updated successfully via RPC.', 'success');
                    }
                } else if (signUpError) {
                    console.warn("Auth SignUp Issue: ", signUpError);
                }

                // Check if mapping exists
                const { data: existing } = await client.from('office_accounts').select('id').eq('email', email).maybeSingle();

                if (existing) {
                    const { error } = await client.from('office_accounts').update({ office_name: office }).eq('id', existing.id);
                    if (error) throw error;
                    showToast('Account privileges updated.', 'success');
                } else {
                    const { error } = await client.from('office_accounts').insert([{ email, office_name: office }]);
                    if (error) throw error;
                    showToast('New office account authorized.', 'success');
                }

                officeAccountForm.reset();
                fetchOfficeAccounts();
            } catch (err) {
                showToast(`Failed to save: ${err.message}`, 'error');
            } finally {
                submitAccBtn.disabled = false;
                submitAccBtn.innerHTML = 'Save Credentials';
            }
        });
    }

    window.deleteOfficeAccount = async function(id) {
        const result = await Swal.fire({
            title: 'Delete Account?',
            html: 'They will lose access to the dashboard immediately.<br><b>This action cannot be undone.</b>',
            iconHtml: '<div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-red-100"><i class="fa-solid fa-triangle-exclamation text-2xl"></i></div>',
            customClass: {
                icon: 'border-0 mb-0 w-full',
                popup: 'rounded-3xl shadow-2xl font-sans pb-4 border border-slate-100',
                title: 'text-2xl font-black text-slate-800 tracking-tight mt-2',
                htmlContainer: 'text-slate-500 font-medium mt-2 mb-6 text-sm',
                actions: 'w-full flex justify-center gap-3 mt-6',
                confirmButton: 'bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl px-8 py-3.5 shadow-md transition-all w-full max-w-[160px] flex items-center justify-center gap-2',
                cancelButton: 'bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl px-8 py-3.5 transition-all border border-slate-200 w-full max-w-[150px] shadow-sm',
            },
            buttonsStyling: false,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-trash"></i> Delete',
            cancelButtonText: 'Keep Account'
        });
        
        if(!result.isConfirmed) return;
        
        const client = await getSupabaseClient();
        if(!client) return;
        
        const { error } = await client.from('office_accounts').delete().eq('id', id);
        if(error) {
            showToast('Failed to delete account.', 'error');
        } else {
            showToast('Account deleted.', 'success');
            fetchOfficeAccounts();
        }
    };



    document.getElementById('refresh-data-btn').addEventListener('click', fetchAdminData);

    (async () => {
        const client = await getSupabaseClient();
        if (!client) return;

        const isAdmin = await isCurrentUserAdmin(client);
        if (isAdmin) {
            openAdminView();
            fetchAdminData();
        }

        client.auth.onAuthStateChange(async (_event, session) => {
            if (!session) {
                closeAdminView();
                return;
            }

            const allowed = await isCurrentUserAdmin(client);
            if (allowed) {
                openAdminView();
                fetchAdminData();
            } else {
                closeAdminView();
            }
        });
    })();

    // === Form Submissions & Supabase ===

    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const clientType = (document.getElementById('client-type').value || '').trim();
        const allowedClientTypes = ['Student', 'Faculty', 'Citizen', 'Business', 'Government'];
        if (!allowedClientTypes.includes(clientType)) {
            showToast('Please select a valid client type.', 'error');
            return;
        }
        
        // Validate Likert Ratings dynamically active
        const activeDims = formConfig.dimensions[currentLang] || formConfig.dimensions['en'];
        for (let d of activeDims) {
            if (currentRatings[d.id] === null || currentRatings[d.id] === undefined) {
                showToast(`Please rate: ${d.label}`, 'error');
                return;
            }
        }

        // Calculate average dynamically
        let sum = 0;
        let count = 0;
        for (let d of activeDims) {
            sum += currentRatings[d.id];
            count++;
        }
        const meanScore = sum / (count || 1);

        const submitBtn = document.getElementById('submit-feedback-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting...';

        const cc1Value = document.querySelector('input[name="cc1"]:checked')?.value;
        const cc2Value = document.getElementById('cc2').value;
        const cc3Value = document.getElementById('cc3').value;

        const payload = {
            office_visited: document.getElementById('office-visited').value,
            service_availed: document.getElementById('service-availed').value,
            client_type: clientType,
            sex: document.getElementById('client-sex').value || null,
            cc1: parseInt(cc1Value || 0),
            cc2: parseInt(cc2Value || 0),
            cc3: parseInt(cc3Value || 0),
            ratings: currentRatings,
            mean_score: parseFloat(meanScore.toFixed(2)),
            commendations: document.getElementById('commendations').value || null,
            suggestions: document.getElementById('suggestions').value || null
        };

        try {
            const client = await getSupabaseClient();
            if (navigator.onLine && client) {
                const { error } = await insertEvaluations(client, [payload]);
                if (error) throw error;
                showToast('Feedback submitted successfully!', 'success');
                resetFeedbackForm();
            } else {
                saveOffline('pendingFeedbacks', payload);
                showToast('Saved offline. Will sync when connected.', 'warning');
                resetFeedbackForm();
            }
        } catch (error) {
            console.error('Feedback insert failed:', error);
            showToast(`Failed to submit (${error.message || 'unknown error'}). Saved offline.`, 'error');
            saveOffline('pendingFeedbacks', payload);
            resetFeedbackForm();
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-regular fa-paper-plane mr-2"></i> Submit Feedback';
        }
    });

    // CC Questions Logic
    document.querySelectorAll('input[name="cc1"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const cc2 = document.getElementById('cc2');
            const cc3 = document.getElementById('cc3');
            if(e.target.value === '4') {
                cc2.value = '5'; // N/A
                cc3.value = '4'; // N/A
                cc2.disabled = true;
                cc3.disabled = true;
                cc2.classList.add('bg-gray-100', 'opacity-50');
                cc3.classList.add('bg-gray-100', 'opacity-50');
            } else {
                cc2.disabled = false;
                cc3.disabled = false;
                cc2.classList.remove('bg-gray-100', 'opacity-50');
                cc3.classList.remove('bg-gray-100', 'opacity-50');
                if(cc2.value === '5') cc2.value = '';
                if(cc3.value === '4') cc3.value = '';
            }
        });
    });

    complaintForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-complaint-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting...';

        const payload = {
            name: document.getElementById('comp-name').value || 'Anonymous',
            contact_details: document.getElementById('comp-contact').value || null,
            date_of_incident: document.getElementById('comp-date').value,
            place_of_incident: document.getElementById('comp-place').value,
            details_of_complaint: document.getElementById('comp-details').value,
            narrative_report: document.getElementById('comp-narrative').value,
            desired_outcome: document.getElementById('comp-outcome').value
        };

        try {
            const client = await getSupabaseClient();
            if (navigator.onLine && client) {
                const { error } = await client.from(COMPLAIN_TABLE).insert([payload]);
                if (error) throw error;
                showToast('Complaint submitted successfully.', 'success');
                complaintForm.reset();
                backToFeedbackBtn.click();
            } else {
                saveOffline('pendingComplaints', payload);
                showToast('Saved offline. Will sync when connected.', 'warning');
                complaintForm.reset();
                backToFeedbackBtn.click();
            }
        } catch (error) {
            console.error('Complaint insert failed:', error);
            showToast(`Error submitting (${error.message || 'unknown error'}). Saved offline.`, 'error');
            saveOffline('pendingComplaints', payload);
            complaintForm.reset();
            backToFeedbackBtn.click();
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-file-shield mr-2"></i> Submit Complaint';
        }
    });

    // === Helper Functions ===

    function resetFeedbackForm() {
        feedbackForm.reset();
        document.querySelectorAll('.likert-btn').forEach(btn => btn.classList.remove('selected'));
        for (let dim in currentRatings) currentRatings[dim] = null;
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        
        const config = {
            success: { bg: 'bg-emerald-600/95', icon: 'fa-circle-check',  label: 'Success' },
            error:   { bg: 'bg-red-600/95',     icon: 'fa-circle-xmark',  label: 'Error' },
            warning: { bg: 'bg-amber-500/95',    icon: 'fa-triangle-exclamation', label: 'Warning' },
            info:    { bg: 'bg-slate-800/95',    icon: 'fa-circle-info',   label: 'Info' }
        };

        const c = config[type] || config.info;

        toast.className = `px-4 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 font-medium text-white text-sm max-w-sm toast-enter ${c.bg}`;
        toast.style.backdropFilter = 'blur(12px)';
        toast.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <i class="fa-solid ${c.icon} text-base"></i>
            </div>
            <div class="flex-grow min-w-0">
                <div class="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">${c.label}</div>
                <div class="text-sm leading-snug">${message}</div>
            </div>
            <button onclick="this.parentElement.classList.replace('toast-enter','toast-leave');setTimeout(()=>this.parentElement.remove(),300)" class="ml-2 shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <i class="fa-solid fa-xmark text-xs"></i>
            </button>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.replace('toast-enter', 'toast-leave');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4500);
    }

    // Offline Storage Logic
    function saveOffline(key, data) {
        let items = JSON.parse(localStorage.getItem(key)) || [];
        items.push(data);
        localStorage.setItem(key, JSON.stringify(items));
    }

    async function syncOfflineData() {
        const client = await getSupabaseClient();
        if (!navigator.onLine || !client) return;

        const pFeedbacks = JSON.parse(localStorage.getItem('pendingFeedbacks')) || [];
        if (pFeedbacks.length > 0) {
            const { error } = await insertEvaluations(client, pFeedbacks);
            if (!error) {
                localStorage.removeItem('pendingFeedbacks');
                showToast('Offline feedbacks synced!', 'success');
            } else {
                console.error('Offline feedback sync failed:', error);
                showToast(`Offline feedback sync failed: ${error.message}`, 'error');
            }
        }

        const pComplaints = JSON.parse(localStorage.getItem('pendingComplaints')) || [];
        if (pComplaints.length > 0) {
            const { error } = await client.from(COMPLAIN_TABLE).insert(pComplaints);
            if (!error) {
                localStorage.removeItem('pendingComplaints');
                showToast('Offline complaints synced!', 'success');
            } else {
                console.error('Offline complaint sync failed:', error);
                showToast(`Offline complaint sync failed: ${error.message}`, 'error');
            }
        }
    }

    window.addEventListener('online', syncOfflineData);

    // === Admin Logic ===
    // === Admin Settings Modal Logic ===
    const adminSettingsModal = document.getElementById('admin-settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const configOffices = document.getElementById('config-offices');
    const configDimensionsList = document.getElementById('config-dimensions-list');
    const addDimensionBtn = document.getElementById('add-dimension-btn');

    function buildSettingsEditor() {
        if(!configDimensionsList) return;
        configDimensionsList.innerHTML = '';
        formConfig.dimensions['en'].forEach((dim, idx) => {
            configDimensionsList.innerHTML += `
                <div class="bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-sm relative transition hover:shadow-md">
                    <button type="button" class="absolute top-4 right-4 text-red-400 hover:text-red-700 delete-dim-btn" data-id="${dim.id}" title="Remove Question"><i class="fa-solid fa-trash-can text-lg"></i></button>
                    <div class="text-sm font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2 pr-6">Question ${idx + 1}</div>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                            <input type="text" class="dim-label w-full border border-slate-300 bg-white rounded-lg p-2.5 text-sm focus:ring-bisu-blue focus:border-bisu-blue" data-id="${dim.id}" value="${dim.label}">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                            <textarea class="dim-desc w-full border border-slate-300 bg-white rounded-lg p-2.5 text-sm focus:ring-bisu-blue focus:border-bisu-blue" data-id="${dim.id}" rows="2">${dim.desc}</textarea>
                        </div>
                    </div>
                </div>
            `;
        });

        document.querySelectorAll('.delete-dim-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-id');
                ['en', 'tl', 'ceb'].forEach(lang => {
                    if(formConfig.dimensions[lang]) {
                        formConfig.dimensions[lang] = formConfig.dimensions[lang].filter(d => d.id !== targetId);
                    }
                });
                buildSettingsEditor();
            });
        });
    }

    if(addDimensionBtn) {
        addDimensionBtn.addEventListener('click', () => {
            const newId = 'custom_' + Date.now();
            const newDim = { id: newId, icon: 'fa-circle-question', label: 'New Question', desc: 'Enter description here' };
            
            ['en', 'tl', 'ceb'].forEach(lang => {
                if(!formConfig.dimensions[lang]) formConfig.dimensions[lang] = [];
                formConfig.dimensions[lang].push({ ...newDim });
            });
            buildSettingsEditor();
            
            setTimeout(() => {
                if(configDimensionsList) configDimensionsList.scrollTop = configDimensionsList.scrollHeight;
            }, 50);
        });
    }

    if(settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            configOffices.value = formConfig.offices.join('\n');
            buildSettingsEditor();
            adminSettingsModal.classList.remove('hidden');
            adminSettingsModal.classList.add('flex');
            document.body.style.overflow = 'hidden';
        });
    }

    if(closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            adminSettingsModal.classList.add('hidden');
            adminSettingsModal.classList.remove('flex');
            document.body.style.overflow = '';
        });
    }

    if(saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async () => {
            try {
                const parsedOffices = configOffices.value.split('\n').map(o => o.trim()).filter(o => o !== '');
                formConfig.offices = parsedOffices;

                // Sync the graphical inputs back to the config
                if(configDimensionsList) {
                    const labels = document.querySelectorAll('.dim-label');
                    const descs = document.querySelectorAll('.dim-desc');
                    
                    labels.forEach((labelInput, idx) => {
                        const targetId = labelInput.getAttribute('data-id');
                        
                        let enTarget = formConfig.dimensions['en'].find(d => d.id === targetId);
                        if(enTarget) {
                            enTarget.label = labelInput.value;
                            enTarget.desc = descs[idx].value;
                        }

                        // We only sync the labels across translation arrays if they match the 'New Question' placeholder.
                        ['tl', 'ceb'].forEach(lang => {
                            let lTarget = formConfig.dimensions[lang].find(d => d.id === targetId);
                            if(lTarget) {
                                if(lTarget.label === 'New Question') lTarget.label = labelInput.value;
                                if(lTarget.desc === 'Enter question description here.') lTarget.desc = descs[idx].value;
                            }
                        });
                    });
                }
                
                formConfig = normalizeFormConfig(formConfig);
                localStorage.setItem('bisuFormConfig', JSON.stringify(formConfig));

                const client = await getSupabaseClient();
                if (client) {
                    const { error } = await client.from('admin_settings').upsert({
                        id: 'global_config',
                        config: formConfig,
                        updated_at: new Date().toISOString()
                    });
                    if (error) throw error;
                }
                
                showToast('Form Settings Updated Successfully!', 'success');
                adminSettingsModal.classList.add('hidden');
                adminSettingsModal.classList.remove('flex');
                document.body.style.overflow = '';
                
                // Re-render
                renderDynamicFields();
                renderLikertScales();
            } catch (error) {
                showToast('Error saving settings.', 'error');
                console.error(error);
            }
        });
    }

    if(manageRecipientsBtn) {
        manageRecipientsBtn.addEventListener('click', () => {
            tempRecipients = (formConfig.recipients || []).map(r => {
                const parts = r.split('|');
                if (parts.length >= 2) return { name: parts[0].trim(), email: parts[1].trim() };
                return { name: r.trim(), email: '' }; // Fallback
            }).filter(r => r.name !== '' || r.email !== '');
            
            renderRecipientsList();
            
            if (manageRecipientsModal) {
                manageRecipientsModal.classList.remove('hidden');
                manageRecipientsModal.classList.add('flex');
                document.body.style.overflow = 'hidden';
            }
        });
    }

    if(closeRecipientsBtn) {
        closeRecipientsBtn.addEventListener('click', () => {
            if (manageRecipientsModal) {
                manageRecipientsModal.classList.add('hidden');
                manageRecipientsModal.classList.remove('flex');
                document.body.style.overflow = '';
            }
        });
    }

    if(saveRecipientsBtn) {
        saveRecipientsBtn.addEventListener('click', async () => {
            saveRecipientsBtn.disabled = true;
            saveRecipientsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...';
            
            try {
                const parsedRecips = tempRecipients
                    .filter(r => r.name.trim() !== '' && r.email.trim() !== '')
                    .map(r => `${r.name.trim()} | ${r.email.trim()}`);
                
                formConfig.recipients = parsedRecips;
                formConfig = normalizeFormConfig(formConfig);
                localStorage.setItem('bisuFormConfig', JSON.stringify(formConfig));
                
                const client = await getSupabaseClient();
                if(client) {
                    await client.from('admin_settings').upsert({
                        id: 'global_config',
                        config: formConfig,
                        updated_at: new Date().toISOString()
                    });
                }
                
                showToast('Email Recipients Updated', 'success');
                manageRecipientsModal.classList.add('hidden');
                manageRecipientsModal.classList.remove('flex');
                document.body.style.overflow = '';
            } catch(e) {
                showToast('Failed to save recipients: ' + e.message, 'error');
            } finally {
                saveRecipientsBtn.disabled = false;
                saveRecipientsBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Save Recipients';
            }
        });
    }

    async function fetchAdminData() {
        const client = await getSupabaseClient();
        if(!client) {
            showToast('Supabase is not connected. Please check your project keys.', 'error');
            return;
        }

        // Fetch Feedbacks
        const { data: fData, error: fErr } = await selectEvaluations(client);
        // Fetch Complaints
        const { data: cData, error: cErr } = await client.from('complaints').select('*').order('created_at', { ascending: false });

        if(fErr || cErr) {
            console.error("Fetch Error", fErr, cErr);
            return;
        }

        document.getElementById('stat-total').textContent = fData.length;
        document.getElementById('stat-complaints').textContent = cData.length;
        
        let totalAvg = 0;
        if(fData.length > 0) {
            totalAvg = fData.reduce((sum, row) => sum + parseFloat(row.mean_score || 0), 0) / fData.length;
            document.getElementById('stat-avg').textContent = totalAvg.toFixed(2);
        }

        renderCCTable(fData);
        renderReportTable(fData);
        renderCommendationsTable(fData);

        const combinedLogs = [
            ...fData.map(row => ({ ...row, type: 'feedback' })),
            ...cData.map(row => ({
                id: row.id,
                created_at: row.created_at,
                office_visited: row.place_of_incident || 'N/A',
                client_type: 'Complainant',
                type: 'complaint',
                mean_score: null,
                service_availed: 'N/A',
                commendations: null,
                suggestions: row.details_of_complaint,
                complaint_payload: row
            }))
        ];
        renderLogTable(combinedLogs);
        renderComplaintsModalList(cData);
    }

    function renderCCTable(data) {
        const tbody = document.getElementById('cc-table-body');
        const tfoot = document.getElementById('cc-table-foot');
        tbody.innerHTML = '';
        tfoot.innerHTML = '';
        
        const grouped = {};
        let totals = { cust: 0, m: 0, f: 0, cit: 0, bus: 0, gov: 0 };
        let ccTotals = new Array(13).fill(0);

        data.forEach(row => {
            if(!grouped[row.office_visited]) {
                grouped[row.office_visited] = { cust: 0, m:0, f:0, cit:0, bus:0, gov:0, cc: new Array(13).fill(0) };
            }
            let g = grouped[row.office_visited];
            g.cust++; totals.cust++;
            
            if(row.sex === 'Male') { g.m++; totals.m++; }
            if(row.sex === 'Female') { g.f++; totals.f++; }
            
            if(row.client_type === 'Citizen') { g.cit++; totals.cit++; }
            if(row.client_type === 'Business') { g.bus++; totals.bus++; }
            if(row.client_type === 'Government') { g.gov++; totals.gov++; }

            if(row.cc1 >= 1 && row.cc1 <= 4) {
                const idx = row.cc1 - 1;
                g.cc[idx]++;
                ccTotals[idx]++;
            }
            if(row.cc2 >= 1 && row.cc2 <= 5) {
                const idx = 4 + (row.cc2 - 1);
                g.cc[idx]++;
                ccTotals[idx]++;
            }
            if(row.cc3 >= 1 && row.cc3 <= 4) {
                const idx = 9 + (row.cc3 - 1);
                g.cc[idx]++;
                ccTotals[idx]++;
            }
        });

        for(let office in grouped) {
            let g = grouped[office];
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b hover:bg-slate-50';
            let ccTds = g.cc.map(v => `<td class="px-1 py-3 border">${v}</td>`).join('');
            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-slate-900 border text-left col-office">${office}</td>
                <td class="px-4 py-3 border font-bold text-bisu-blue">${g.cust}</td>
                <td class="px-2 py-3 border">${g.m}</td>
                <td class="px-2 py-3 border">${g.f}</td>
                <td class="px-2 py-3 border">${g.cit}</td>
                <td class="px-2 py-3 border">${g.bus}</td>
                <td class="px-2 py-3 border">${g.gov}</td>
                ${ccTds}
            `;
            tbody.appendChild(tr);
        }

        if(Object.keys(grouped).length === 0) {
            tbody.innerHTML = `<tr><td colspan="20" class="px-4 py-4 text-center text-slate-500">No data found yet.</td></tr>`;
        } else {
            let ccFoot = ccTotals.map(v => `<td class="px-1 py-3 border">${v}</td>`).join('');
            tfoot.innerHTML = `
                <tr>
                    <td class="px-4 py-3 border text-right">Overall Rating</td>
                    <td class="px-4 py-3 border font-bold text-bisu-blue">${totals.cust}</td>
                    <td class="px-2 py-3 border">${totals.m}</td>
                    <td class="px-2 py-3 border">${totals.f}</td>
                    <td class="px-2 py-3 border">${totals.cit}</td>
                    <td class="px-2 py-3 border">${totals.bus}</td>
                    <td class="px-2 py-3 border">${totals.gov}</td>
                    ${ccFoot}
                </tr>
            `;
        }
    }

    function renderReportTable(data) {
        const thead = document.getElementById('report-table-head');
        const tbody = document.getElementById('report-table-body');
        let tfoot = document.getElementById('report-table-foot');
        if (!tfoot) {
            tfoot = document.createElement('tfoot');
            tfoot.id = 'report-table-foot';
            tfoot.className = 'font-bold bg-slate-50';
            tbody.parentNode.appendChild(tfoot);
        }
        
        tbody.innerHTML = '';
        tfoot.innerHTML = '';

        const activeDimensions = formConfig.dimensions['en'];
        
        // Dynamically build the table header for active dimensions
        if(thead) {
            thead.innerHTML = `
                <tr>
                    <th scope="col" class="px-4 py-3 border">Offices</th>
                    <th scope="col" class="px-4 py-3 border text-center">Number of<br>Customers (f)</th>
                    ${activeDimensions.map(d => {
                        // Extract label text after numbers if exists (e.g., "1. Responsiveness" -> "Responsiveness")
                        let labelText = d.label;
                        if(labelText.includes('.')) {
                            labelText = labelText.split('.').slice(1).join('.').trim();
                        }
                        // Handle "Reliability (Quality)" specifically to match physical form line breaks
                        if(labelText === 'Reliability (Quality)') labelText = 'Reliability<br>(Quality)';
                        if(labelText === 'Access & Facilities') labelText = 'Access &<br>Facilities';
                        
                        return `<th scope="col" class="px-4 py-3 border text-center" title="${d.label}">${labelText}</th>`;
                    }).join('')}
                    <th scope="col" class="px-3 py-3 border text-center bg-blue-50">Mean<br>Satisfaction</th>
                    <th scope="col" class="px-4 py-3 border text-center">Description</th>
                </tr>
            `;
        }

        // Group by office
        const grouped = {};
        let totals = { cust: 0, meanScore: 0, dims: {} };
        activeDimensions.forEach(d => totals.dims[d.id] = 0);

        data.forEach(row => {
            if(!grouped[row.office_visited]) {
                grouped[row.office_visited] = { count: 0, meanScore:0, dims: {} };
                activeDimensions.forEach(d => grouped[row.office_visited].dims[d.id] = 0);
            }
            let g = grouped[row.office_visited];
            g.count++;
            totals.cust++;
            g.meanScore += parseFloat(row.mean_score || 0);
            totals.meanScore += parseFloat(row.mean_score || 0);
            
            const rowRatings = row.ratings || row;
            activeDimensions.forEach(d => {
                g.dims[d.id] += parseInt(rowRatings[d.id] || 0);
                totals.dims[d.id] += parseInt(rowRatings[d.id] || 0);
            });
        });

        // Function to determine description
        const getDesc = (score) => {
            if(score >= 4.5) return 'Outstanding';
            if(score >= 3.5) return 'Very Satisfactory';
            if(score >= 2.5) return 'Satisfactory';
            if(score >= 1.5) return 'Fair';
            return 'Poor';
        };

        for(let office in grouped) {
            let g = grouped[office];
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b hover:bg-slate-50';
            
            let dimsCols = activeDimensions.map(d => {
                let average = g.count > 0 ? (g.dims[d.id]/g.count).toFixed(2) : "0.00";
                return `<td class="px-4 py-3 text-center border font-medium">${average}</td>`;
            }).join('');

            let rowAvg = g.count > 0 ? (g.meanScore/g.count).toFixed(2) : "0.00";

            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-slate-900 border text-left col-office">${office}</td>
                <td class="px-4 py-3 text-center border font-bold text-bisu-blue">${g.count}</td>
                ${dimsCols}
                <td class="px-4 py-3 text-center border bg-blue-50 font-bold">${rowAvg}</td>
                <td class="px-4 py-3 text-center border text-xs font-semibold uppercase">${getDesc(rowAvg)}</td>
            `;
            tbody.appendChild(tr);
        }

        if(Object.keys(grouped).length === 0) {
            tbody.innerHTML = `<tr><td colspan="${activeDimensions.length + 4}" class="px-4 py-4 text-center text-slate-500">No data found yet.</td></tr>`;
        } else {
            let dimsFootCols = activeDimensions.map(d => {
                let average = totals.cust > 0 ? (totals.dims[d.id]/totals.cust).toFixed(2) : "0.00";
                return `<td class="px-4 py-3 border">${average}</td>`;
            }).join('');
            let totalAvg = totals.cust > 0 ? (totals.meanScore/totals.cust).toFixed(2) : "0.00";
            
            tfoot.innerHTML = `
                <tr>
                    <td class="px-4 py-3 border text-left font-bold">Overall Rating</td>
                    <td class="px-4 py-3 border font-bold text-center text-bisu-blue">${totals.cust}</td>
                    ${dimsFootCols}
                    <td class="px-4 py-3 border bg-blue-50 text-center font-bold">${totalAvg}</td>
                    <td class="px-4 py-3 border text-xs font-semibold uppercase">${getDesc(totalAvg)}</td>
                </tr>
            `;
        }
    }

    function renderCommendationsTable(data) {
        const tbody = document.getElementById('commendations-table-body');
        tbody.innerHTML = '';
        
        let hasData = false;

        data.forEach(row => {
            const hasCommendation = row.commendations && row.commendations.trim() !== '';
            const hasSuggestion = row.suggestions && row.suggestions.trim() !== '';
            
            if (hasCommendation || hasSuggestion) {
                hasData = true;
                const tr = document.createElement('tr');
                tr.className = 'bg-white border-b hover:bg-slate-50 text-sm';
                
                tr.innerHTML = `
                    <td class="px-4 py-3 font-medium text-slate-900 border text-left align-top col-office">${row.office_visited}</td>
                    <td class="px-4 py-3 border text-left align-top max-w-[250px] whitespace-pre-wrap">${hasCommendation ? row.commendations : '<span class="text-slate-400 italic">None</span>'}</td>
                    <td class="px-4 py-3 border text-left align-top max-w-[250px] whitespace-pre-wrap">${hasSuggestion ? row.suggestions : '<span class="text-slate-400 italic">None</span>'}</td>
                    <td class="px-4 py-3 border align-top"></td>
                    <td class="px-4 py-3 border align-top"></td>
                    <td class="px-4 py-3 border align-top"></td>
                    <td class="px-4 py-3 border align-top bg-slate-50"></td>
                    <td class="px-4 py-3 border align-top bg-slate-50"></td>
                    <td class="px-4 py-3 border align-top bg-slate-50"></td>
                `;
                tbody.appendChild(tr);
            }
        });

        if (!hasData) {
            tbody.innerHTML = '<tr><td colspan="9" class="px-4 py-4 text-center text-slate-500">No commendations or suggestions found.</td></tr>';
        }
    }

    function renderLogTable(data) {
        const logTbody = document.getElementById('log-table-body');
        logTbody.innerHTML = '';
        
        // Add Header for Actions
        const logThead = document.querySelector('#view-admin table:nth-of-type(2) thead tr');
        if(logThead && !logThead.innerHTML.includes('Actions')) {
            logThead.innerHTML = `
                <th scope="col" class="px-4 py-3">Time</th>
                <th scope="col" class="px-4 py-3">Office</th>
                <th scope="col" class="px-4 py-3">Client Type</th>
                <th scope="col" class="px-4 py-3">Type</th>
                <th scope="col" class="px-4 py-3 text-center">Score</th>
                <th scope="col" class="px-4 py-3 text-center">Actions</th>
            `;
        }

        const recentData = [...data].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
        
        recentData.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b hover:bg-slate-50 transition';
            const isComplaint = row.type === 'complaint';
            const badgeClass = isComplaint ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
            const escapedJson = encodeURIComponent(JSON.stringify(row));
            
            tr.innerHTML = `
                <td class="px-4 py-3 font-mono text-xs text-slate-500">${new Date(row.created_at).toLocaleString()}</td>
                <td class="px-4 py-3 font-medium text-slate-800">${row.office_visited}</td>
                <td class="px-4 py-3">${row.client_type}</td>
                <td class="px-4 py-3"><span class="px-2 py-1 text-[10px] font-bold uppercase rounded ${badgeClass}">${row.type || 'Feedback'}</span></td>
                <td class="px-4 py-3 text-center font-bold font-mono">${row.mean_score ? parseFloat(row.mean_score).toFixed(2) : 'N/A'}</td>
                <td class="px-4 py-3 text-center space-x-2">
                    <button class="text-blue-500 hover:text-blue-700 transition action-email-btn" data-json="${escapedJson}" title="Forward Feedback via Email"><i class="fa-solid fa-envelope"></i></button>
                    <button class="text-slate-500 hover:text-bisu-blue transition action-print-btn" data-json="${escapedJson}" title="Print Individual Feedback Document"><i class="fa-solid fa-print"></i></button>
                </td>
            `;
            logTbody.appendChild(tr);
        });

        if(recentData.length === 0) {
            logTbody.innerHTML = '<tr><td colspan="6" class="px-4 py-4 text-center text-slate-400">No submissions yet</td></tr>';
        }

        // Attach action listeners
        document.querySelectorAll('.action-email-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = JSON.parse(decodeURIComponent(e.currentTarget.getAttribute('data-json')));
                const subject = encodeURIComponent(`BISU Feedback Alert - ${row.office_visited}`);
                let bodyStr = `Attached is recent feedback submitted regarding the ${row.office_visited}.\n\n`;
                bodyStr += `Date: ${new Date(row.created_at).toLocaleString()}\n`;
                if(row.type === 'complaint' && row.complaint_payload) {
                    const complaint = row.complaint_payload;
                    bodyStr += `Complaint Name: ${complaint.name || 'Anonymous'}\n`;
                    bodyStr += `Place of Incident: ${complaint.place_of_incident || 'N/A'}\n`;
                    bodyStr += `Date of Incident: ${complaint.date_of_incident || 'N/A'}\n`;
                    bodyStr += `Details: ${complaint.details_of_complaint || 'N/A'}\n`;
                    bodyStr += `Narrative: ${complaint.narrative_report || 'N/A'}\n`;
                    bodyStr += `Desired Outcome: ${complaint.desired_outcome || 'N/A'}\n\n`;
                } else {
                    bodyStr += `Service: ${row.service_availed}\n`;
                    bodyStr += `Client: ${row.client_type}\n`;
                    bodyStr += `Average Score: ${row.mean_score || 'N/A'} out of 5.0\n\n`;
                    if(row.commendations) bodyStr += `Commendations: ${row.commendations}\n\n`;
                    if(row.suggestions) bodyStr += `Suggestions/Complaints: ${row.suggestions}\n\n`;
                }
                bodyStr += `Please review and take any necessary actions.`;
                
                window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyStr)}`;
            });
        });

        document.querySelectorAll('.action-print-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = JSON.parse(decodeURIComponent(e.currentTarget.getAttribute('data-json')));
                const html = row.type === 'complaint' && row.complaint_payload ? `
                    <html><head><title>Print Complaint - BISU</title></head>
                    <body style="font-family: Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto;">
                        <div style="text-align: center; border-bottom: 2px solid #E84A1C; padding-bottom: 20px; margin-bottom: 30px;">
                            <h2 style="color: #E84A1C; margin: 0;">Bohol Island State University - Calape</h2>
                            <h3 style="color: #64748b; margin: 5px 0 0 0;">Official Complaint Record</h3>
                        </div>
                        <table style="width: 100%; margin-bottom: 30px; text-align: left; font-size: 14px;">
                            <tr><th style="padding: 8px 0; width: 30%;">Date Filed:</th><td>${new Date(row.created_at).toLocaleString()}</td></tr>
                            <tr><th style="padding: 8px 0;">Complainant:</th><td style="font-weight: bold;">${row.complaint_payload.name || 'Anonymous'}</td></tr>
                            <tr><th style="padding: 8px 0;">Place of Incident:</th><td>${row.complaint_payload.place_of_incident || 'N/A'}</td></tr>
                            <tr><th style="padding: 8px 0;">Desired Outcome:</th><td>${row.complaint_payload.desired_outcome || 'N/A'}</td></tr>
                        </table>
                        <div style="margin-bottom: 20px;">
                            <h4 style="margin-bottom: 5px; color: #475569;">Details of Complaint:</h4>
                            <p style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 5px; white-space: pre-wrap;">${row.complaint_payload.details_of_complaint || 'None provided.'}</p>
                        </div>
                        <div>
                            <h4 style="margin-bottom: 5px; color: #475569;">Narrative Report:</h4>
                            <p style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 5px; white-space: pre-wrap;">${row.complaint_payload.narrative_report || 'None provided.'}</p>
                        </div>
                        <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8;">
                            Printed via BISU Admin System on ${new Date().toLocaleString()}
                        </div>
                    </body></html>
                ` : `
                    <html><head><title>Print Feedback - BISU</title></head>
                    <body style="font-family: Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto;">
                        <div style="text-align: center; border-bottom: 2px solid #161275; padding-bottom: 20px; margin-bottom: 30px;">
                            <h2 style="color: #161275; margin: 0;">Bohol Island State University - Calape</h2>
                            <h3 style="color: #64748b; margin: 5px 0 0 0;">Official Satisfaction Feedback Record</h3>
                        </div>
                        <table style="width: 100%; margin-bottom: 30px; text-align: left; font-size: 14px;">
                            <tr><th style="padding: 8px 0; width: 30%;">Date Filed:</th><td>${new Date(row.created_at).toLocaleString()}</td></tr>
                            <tr><th style="padding: 8px 0;">Office Subjected:</th><td style="font-weight: bold;">${row.office_visited}</td></tr>
                            <tr><th style="padding: 8px 0;">Service Used:</th><td>${row.service_availed}</td></tr>
                            <tr><th style="padding: 8px 0;">Client Demographics:</th><td>${row.client_type} (${row.sex || 'Not stated'})</td></tr>
                        </table>
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 20px;">
                            <h2 style="margin: 0; font-size: 24px;">Overall Score: <span style="color: ${row.mean_score >= 3 ? '#0E811B' : '#E84A1C'};">${row.mean_score || 'N/A'}</span> / 5.0</h2>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <h4 style="margin-bottom: 5px; color: #475569;">Commendations / Praises:</h4>
                            <p style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 5px; white-space: pre-wrap;">${row.commendations || 'None provided by client.'}</p>
                        </div>
                        <div>
                            <h4 style="margin-bottom: 5px; color: #475569;">Suggestions / Criticisms:</h4>
                            <p style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 5px; white-space: pre-wrap;">${row.suggestions || 'None provided by client.'}</p>
                        </div>
                        <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8;">
                            Printed via BISU Admin System on ${new Date().toLocaleString()}
                        </div>
                    </body></html>
                `;
                const printWin = window.open('', '_blank');
                printWin.document.write(html);
                printWin.document.close();
                printWin.focus();
                setTimeout(() => { printWin.print(); printWin.close(); }, 300);
            });
        });
    }

    function renderComplaintsModalList(cData) {
        const container = document.getElementById('complaints-list-container');
        if (!container) return;
        container.innerHTML = '';

        if (!cData || cData.length === 0) {
            container.innerHTML = '<div class="text-center py-10 text-slate-400 italic">No filed complaints at this time.</div>';
            return;
        }

        cData.forEach(c => {
            const dateStr = new Date(c.created_at).toLocaleString();
            const el = document.createElement('div');
            el.className = "bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm";
            el.innerHTML = `
                <div class="flex flex-col sm:flex-row justify-between mb-3 border-b border-slate-200 pb-3">
                    <div>
                        <h4 class="font-bold text-slate-800 text-lg">Actioned Against: <span class="text-red-600">${c.details_of_complaint || 'N/A'}</span></h4>
                        <p class="text-xs text-slate-500 font-mono mt-1"><i class="fa-regular fa-clock"></i> ${dateStr}</p>
                    </div>
                    <div class="mt-2 sm:mt-0 text-right">
                        <span class="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-1 rounded uppercase shadow-sm">High Priority</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm mt-3">
                    <div><span class="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">Complainant</span> <span class="text-slate-900">${c.name || 'Anonymous'}</span></div>
                    <div><span class="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">Contact Details</span> <span class="text-slate-900">${c.contact_details || 'Not provided'}</span></div>
                    <div><span class="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">Date of Incident</span> <span class="text-slate-900">${c.date_of_incident}</span></div>
                    <div><span class="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">Place of Incident</span> <span class="text-slate-900">${c.place_of_incident}</span></div>
                </div>
                <div class="bg-white p-4 rounded-lg border border-slate-200 mb-3 text-sm shadow-inner">
                    <span class="font-bold text-slate-800 block text-[10px] uppercase tracking-wider mb-1">Narrative Report:</span>
                    <p class="text-slate-700 whitespace-pre-wrap">${c.narrative_report || 'None'}</p>
                </div>
                <div class="bg-red-50 p-4 rounded-lg border border-red-100 text-sm shadow-inner">
                    <span class="font-bold text-red-900 block text-[10px] uppercase tracking-wider mb-1">Desired Outcome / Resolution:</span>
                    <p class="text-red-800 whitespace-pre-wrap font-medium">${c.desired_outcome || 'None'}</p>
                </div>
            `;
            container.appendChild(el);
        });
    }

    // Try syncing any pending on load
    setTimeout(() => {
        syncOfflineData();
    }, 2000);
});
