// Adventure Escape SA: shared package, activity, fee calculator and booking logic.
const ADVENTURE_STORAGE_KEY = "adventureEscapeSASelection";

function getAdventureSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(ADVENTURE_STORAGE_KEY));
    return {
      package: saved && saved.package ? saved.package : null,
      activities: saved && Array.isArray(saved.activities) ? saved.activities : [],
      groupSize: saved && Number.isInteger(saved.groupSize) && saved.groupSize > 0 ? saved.groupSize : 1,
      promoCode: saved && saved.promoCode === "WILD10" ? "WILD10" : ""
    };
  } catch (error) {
    return { package: null, activities: [], groupSize: 1, promoCode: "" };
  }
}

function saveAdventureSelection(selection) {
  localStorage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(selection));
}

function formatRand(amount) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount) || 0).replace("ZAR", "R");
}

function getSelectedItems(selection = getAdventureSelection()) {
  return [
    ...(selection.package ? [{ ...selection.package, type: "Package" }] : []),
    ...selection.activities.map(activity => ({ ...activity, type: "Individual activity" }))
  ];
}

function calculateAdventureTotals(selection = getAdventureSelection()) {
  const items = getSelectedItems(selection);
  const groupSize = Math.max(1, selection.groupSize || 1);
  const perPersonSubtotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const subtotal = perPersonSubtotal * groupSize;

  let bookingDiscountRate = 0;
  if (items.length === 2) bookingDiscountRate = 0.05;
  else if (items.length === 3) bookingDiscountRate = 0.10;
  else if (items.length >= 4) bookingDiscountRate = 0.15;

  const bookingDiscount = subtotal * bookingDiscountRate;
  const afterBookingDiscount = subtotal - bookingDiscount;
  const promoDiscount = selection.promoCode === "WILD10" ? afterBookingDiscount * 0.10 : 0;
  const total = Math.max(0, afterBookingDiscount - promoDiscount);

  return {
    items,
    groupSize,
    perPersonSubtotal,
    subtotal,
    bookingDiscountRate,
    bookingDiscount,
    promoDiscount,
    total,
    perPersonTotal: total / groupSize
  };
}

// Package cards: one package can be selected at a time.
function setupPackageSelection() {
  const buttons = document.querySelectorAll("[data-select-package]");
  if (!buttons.length) return;

  const note = document.getElementById("packageSelectionNote");
  const current = getAdventureSelection();

  buttons.forEach(button => {
    const isSelected = current.package && current.package.id === button.dataset.id;
    if (isSelected) {
      button.textContent = "Selected ✓";
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      const selection = getAdventureSelection();
      selection.package = {
        id: button.dataset.id,
        name: button.dataset.name,
        price: Number(button.dataset.price),
        image: button.dataset.image || "",
        description: button.dataset.description || ""
      };
      saveAdventureSelection(selection);
      // Show the selected package overview before the fee calculator.
      window.location.href = "overview.html";

      buttons.forEach(other => {
        other.textContent = "Select";
        other.classList.remove("is-selected");
      });
      button.textContent = "Selected ✓";
      button.classList.add("is-selected");

      if (note) {
        note.textContent = `${selection.package.name} has been selected. Continue to individual activities or go to the fee calculator.`;
      }
    });
  });
}

// Activity cards: add each activity once. The group size is controlled on the fee page.
function setupActivitySelection() {
  const buttons = document.querySelectorAll("[data-add-activity]");
  if (!buttons.length) return;

  buttons.forEach(button => {
    const selection = getAdventureSelection();
    const alreadyAdded = selection.activities.some(item => item.id === button.dataset.id);
    if (alreadyAdded) {
      button.textContent = "✓";
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      const updated = getAdventureSelection();
      const exists = updated.activities.some(item => item.id === button.dataset.id);

      if (!exists) {
        updated.activities.push({
          id: button.dataset.id,
          name: button.dataset.name,
          price: Number(button.dataset.price),
          image: button.dataset.image || ""
        });
        saveAdventureSelection(updated);
      }

      button.textContent = "✓";
      button.classList.add("is-selected");
      const note = document.getElementById("activitySelectionNote");
      if (note) {
        note.textContent = exists
          ? `${button.dataset.name} is already in your selection.`
          : `${button.dataset.name} has been added. You can add more activities or view your fees.`;
      }
    });
  });
}

function renderFeeCalculator() {
  const itemsList = document.getElementById("itemsList");
  if (!itemsList) return;

  const emptyState = document.getElementById("emptyState");
  const populatedState = document.getElementById("populatedState");
  const selection = getAdventureSelection();
  const totals = calculateAdventureTotals(selection);

  if (totals.items.length === 0) {
    emptyState.hidden = false;
    populatedState.hidden = true;
    return;
  }

  emptyState.hidden = true;
  populatedState.hidden = false;

  itemsList.innerHTML = totals.items.map(item => `
    <article class="selected-item-card">
      <img src="${escapeHtml(item.image || "images/adventure escape sa.jpeg")}" alt="${escapeHtml(item.name)}">
      <div class="item-details">
        <span class="item-badge">${escapeHtml(item.type)}</span>
        <h3>${escapeHtml(item.name)}</h3>
        <span class="item-per">Per person</span>
      </div>
      <div class="item-pricing">
        <span class="item-price">${formatRand(item.price)}</span>
        <button type="button" class="remove-item-btn" data-remove-item="${escapeHtml(item.id)}" data-remove-type="${item.type === "Package" ? "package" : "activity"}">Remove</button>
      </div>
    </article>
  `).join("");

  const groupCount = document.getElementById("groupSizeCount");
  const itemCount = document.getElementById("breakdownItemCount");
  const subtotal = document.getElementById("breakdownSubtotal");
  const bookingDiscountRow = document.getElementById("bookingDiscountRow");
  const bookingDiscountLabel = document.getElementById("bookingDiscountLabel");
  const bookingDiscountAmount = document.getElementById("bookingDiscountAmount");
  const promoDiscountRow = document.getElementById("promoDiscountRow");
  const promoDiscountAmount = document.getElementById("promoDiscountAmount");
  const totalAmount = document.getElementById("totalAmount");
  const totalPerPerson = document.getElementById("totalPerPerson");
  const promoInput = document.getElementById("promoInput");

  if (groupCount) groupCount.textContent = totals.groupSize;
  if (itemCount) itemCount.textContent = `${totals.items.length} item${totals.items.length === 1 ? "" : "s"} × ${totals.groupSize} person${totals.groupSize === 1 ? "" : "s"}`;
  if (subtotal) subtotal.textContent = formatRand(totals.subtotal);

  if (bookingDiscountRow) bookingDiscountRow.hidden = totals.bookingDiscount <= 0;
  if (bookingDiscountLabel) bookingDiscountLabel.textContent = `Booking discount (${Math.round(totals.bookingDiscountRate * 100)}%)`;
  if (bookingDiscountAmount) bookingDiscountAmount.textContent = `-${formatRand(totals.bookingDiscount)}`;

  if (promoDiscountRow) promoDiscountRow.hidden = totals.promoDiscount <= 0;
  if (promoDiscountAmount) promoDiscountAmount.textContent = `-${formatRand(totals.promoDiscount)}`;
  if (promoInput && document.activeElement !== promoInput) promoInput.value = selection.promoCode;

  if (totalAmount) totalAmount.textContent = formatRand(totals.total);
  if (totalPerPerson) totalPerPerson.textContent = `${formatRand(totals.perPersonTotal)} per person`;

  // Store the latest calculation for the booking page.
  selection.calculation = {
    subtotal: totals.subtotal,
    bookingDiscount: totals.bookingDiscount,
    promoDiscount: totals.promoDiscount,
    total: totals.total,
    perPersonTotal: totals.perPersonTotal
  };
  saveAdventureSelection(selection);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function setupFeeCalculator() {
  if (!document.getElementById("itemsList")) return;

  document.getElementById("decreaseGroup")?.addEventListener("click", () => {
    const selection = getAdventureSelection();
    selection.groupSize = Math.max(1, selection.groupSize - 1);
    saveAdventureSelection(selection);
    renderFeeCalculator();
  });

  document.getElementById("increaseGroup")?.addEventListener("click", () => {
    const selection = getAdventureSelection();
    selection.groupSize = Math.min(100, selection.groupSize + 1);
    saveAdventureSelection(selection);
    renderFeeCalculator();
  });

  document.getElementById("applyPromoBtn")?.addEventListener("click", () => {
    const input = document.getElementById("promoInput");
    const message = document.getElementById("promoMessage");
    const code = input.value.trim().toUpperCase();
    const selection = getAdventureSelection();

    if (code === "WILD10") {
      selection.promoCode = "WILD10";
      message.textContent = "WILD10 has been applied: an additional 10% discount.";
      message.className = "form-message success-message";
    } else {
      selection.promoCode = "";
      message.textContent = code ? "That promo code is not valid. Try WILD10." : "Enter a promo code first.";
      message.className = "form-message error-message";
    }
    saveAdventureSelection(selection);
    renderFeeCalculator();
  });

  document.getElementById("itemsList")?.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-item]");
    if (!button) return;

    const selection = getAdventureSelection();
    if (button.dataset.removeType === "package") {
      selection.package = null;
    } else {
      selection.activities = selection.activities.filter(item => item.id !== button.dataset.removeItem);
    }
    saveAdventureSelection(selection);
    renderFeeCalculator();
  });

  document.getElementById("clearSelectionBtn")?.addEventListener("click", () => {
    const selection = getAdventureSelection();
    selection.package = null;
    selection.activities = [];
    selection.promoCode = "";
    saveAdventureSelection(selection);
    renderFeeCalculator();
  });

  document.getElementById("proceedToBookingBtn")?.addEventListener("click", () => {
    const selection = getAdventureSelection();
    if (getSelectedItems(selection).length === 0) return;
    window.location.href = "booking.html";
  });

  renderFeeCalculator();
}

function renderBookingSummary() {
  const list = document.getElementById("bookingItemsSummary");
  if (!list) return;

  const selection = getAdventureSelection();
  const totals = calculateAdventureTotals(selection);
  const empty = document.getElementById("bookingEmptyState");
  const summary = document.getElementById("bookingSummary");
  const form = document.getElementById("bookingForm");

  if (totals.items.length === 0) {
    empty.hidden = false;
    summary.hidden = true;
    form.hidden = true;
    return;
  }

  empty.hidden = true;
  summary.hidden = false;
  form.hidden = false;

  list.innerHTML = totals.items.map(item => `
    <div class="booking-summary-item">
      <span>${escapeHtml(item.name)} <small>(${escapeHtml(item.type)})</small></span>
      <strong>${formatRand(item.price)} / person</strong>
    </div>
  `).join("");

  document.getElementById("bookingGroupSize").textContent = totals.groupSize;
  document.getElementById("bookingTotal").textContent = formatRand(totals.total);

  const peopleInput = document.getElementById("bookingPeople");
  if (peopleInput) peopleInput.value = totals.groupSize;
}

function setupBookingForm() {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  renderBookingSummary();

  const dateInput = document.getElementById("bookingDate");
  if (dateInput) {
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString().split("T")[0];
    dateInput.min = localToday;
  }

  document.getElementById("bookingPeople")?.addEventListener("change", event => {
    const value = Math.max(1, Math.min(100, Number(event.target.value) || 1));
    event.target.value = value;
    const selection = getAdventureSelection();
    selection.groupSize = value;
    saveAdventureSelection(selection);
    renderBookingSummary();
  });

  form.addEventListener("submit", event => {
    event.preventDefault();

    const message = document.getElementById("bookingFormMessage");
    const selection = getAdventureSelection();
    if (getSelectedItems(selection).length === 0) {
      message.textContent = "Please select a package or activity before confirming.";
      message.className = "form-message error-message";
      return;
    }

    if (!form.reportValidity()) return;

    const phone = document.getElementById("bookingPhone").value.trim();
    const digitsOnly = phone.replace(/\D/g, "");
    if (!/^\+?[0-9\s()-]+$/.test(phone) || digitsOnly.length < 10 || digitsOnly.length > 15) {
      message.textContent = "Please enter a valid phone number containing 10 to 15 digits.";
      message.className = "form-message error-message";
      document.getElementById("bookingPhone").focus();
      return;
    }

    const booking = {
      fullName: document.getElementById("bookingName").value.trim(),
      phone,
      email: document.getElementById("bookingEmail").value.trim(),
      date: document.getElementById("bookingDate").value,
      people: selection.groupSize,
      notes: document.getElementById("bookingNotes").value.trim(),
      items: getSelectedItems(selection),
      total: calculateAdventureTotals(selection).total,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem("adventureEscapeSALastBooking", JSON.stringify(booking));
    message.textContent = `Thank you, ${booking.fullName}! Your booking request has been prepared successfully. Please contact Adventure Escape SA to complete confirmation.`;
    message.className = "form-message success-message";
  });
}


function renderPackageOverview() {
  const target = document.getElementById("overviewContent");
  if (!target) return;
  const selection = getAdventureSelection();
  const chosen = selection.package;
  if (!chosen) {
    target.innerHTML = `<div class="empty-state-card"><h2>No package selected yet</h2><p>Please choose a package first.</p><a href="packages.html" class="btn-primary">Choose a package</a></div>`;
    return;
  }
  const activities = selection.activities || [];
  target.innerHTML = `
    <article class="overview-package-card">
      <div class="overview-package-image"><img src="${escapeHtml(chosen.image || 'images/adventure escape sa.jpeg')}" alt="${escapeHtml(chosen.name)}"></div>
      <div class="overview-package-details">
        <span class="section-tag">YOUR SELECTED PACKAGE</span>
        <h2>${escapeHtml(chosen.name)}</h2>
        <p class="overview-package-description">${escapeHtml(chosen.description || 'Enjoy this Adventure Escape SA outdoor experience.')}</p>
        <p class="overview-package-price">${formatRand(chosen.price)} <span>per person</span></p>
      </div>
    </article>
    ${activities.length ? `<section class="overview-activities"><h3>Additional activities selected</h3><ul>${activities.map(a => `<li>${escapeHtml(a.name)} — ${formatRand(a.price)} per person</li>`).join('')}</ul></section>` : `<p class="overview-no-activities">You have not added individual activities yet. You can add activities or continue to the fee calculator.</p>`}
    <div class="page-action-row">
      <a href="packages.html" class="btn-secondary">Choose a different package</a>
      <a href="indivisual.html" class="btn-secondary">Add individual activities</a>
      <a href="feespage.html" class="btn-primary">Continue to Fees Calculator</a>
    </div>`;
}

// Preserve the tab-switching helper if those tab elements are present on another page.
function switchMainTab(targetTab) {
  const packagesTab = document.getElementById("packagesTab");
  const activitiesTab = document.getElementById("activitiesTab");
  const packagesView = document.getElementById("packagesView");
  const activitiesView = document.getElementById("activitiesView");
  const difficultyFilters = document.getElementById("difficultyFilters");
  const categoryFilters = document.getElementById("categoryFilters");

  if (!packagesTab || !activitiesTab || !packagesView || !activitiesView) return;

  const showPackages = targetTab === "packages";
  packagesTab.classList.toggle("active", showPackages);
  activitiesTab.classList.toggle("active", !showPackages);
  packagesView.classList.toggle("active", showPackages);
  activitiesView.classList.toggle("active", !showPackages);
  difficultyFilters?.classList.toggle("active", showPackages);
  categoryFilters?.classList.toggle("active", !showPackages);
}
window.switchMainTab = switchMainTab;

// Keep the existing feedback form validation working on pages that contain its fields.
function setupFeedbackValidation() {
  const form = document.getElementById("myForm");
  const firstName = document.getElementById("firstName");
  const surname = document.getElementById("surname");
  const phone = document.getElementById("phone");
  const email = document.getElementById("email");
  const popup = document.getElementById("successPopup");
  const feedbackMessage = document.getElementById("feedbackMessage");
  if (!form || !firstName || !surname || !phone || !email) return;

  function setError(input, errorId, message) {
    const error = document.getElementById(errorId);
    if (error) error.textContent = message;
    input.classList.toggle("error", Boolean(message));
    input.classList.toggle("valid", !message);
  }

  function validateName(input, errorId) {
    const value = input.value.trim();
    const valid = /^[\p{L} ]+$/u.test(value);
    setError(input, errorId, !value ? "This field cannot be empty." : !valid ? "Only alphabetic characters are allowed." : "");
    return Boolean(value && valid);
  }

  function validatePhone() {
    const value = phone.value.trim();
    const valid = /^\+?[0-9\s()-]{10,18}$/.test(value) && value.replace(/\D/g, "").length >= 10;
    setError(phone, "phoneError", !value ? "Phone number cannot be empty." : !valid ? "Please enter a valid phone number." : "");
    return valid;
  }

  function validateEmail() {
    const value = email.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setError(email, "emailError", !value ? "Email address cannot be empty." : !valid ? "Please enter a valid email address." : "");
    return valid;
  }

  firstName.addEventListener("input", () => validateName(firstName, "firstNameError"));
  surname.addEventListener("input", () => validateName(surname, "surnameError"));
  phone.addEventListener("input", validatePhone);
  email.addEventListener("input", validateEmail);

  form.addEventListener("submit", event => {
    event.preventDefault();
    const valid = validateName(firstName, "firstNameError") &&
      validateName(surname, "surnameError") && validateEmail() && validatePhone();

    if (!valid) return;
    if (feedbackMessage) feedbackMessage.textContent = `Thank you, ${firstName.value.trim()}! Your information has been submitted successfully.`;
    if (popup) popup.style.display = "flex";
    else form.reset();
  });

  document.getElementById("closePopup")?.addEventListener("click", () => {
    if (popup) popup.style.display = "none";
  });
}

document.addEventListener("DOMContentLoaded", () => {

    setupPackageSelection();

    setupActivitySelection();

    setupFeeCalculator();

    setupBookingForm();

    renderPackageOverview();

    setupFeedbackValidation();

    setupContactValidation();

});


// ======================================
// CONTACT US FORM VALIDATION
// ======================================

function setupContactValidation() {

    const form = document.getElementById("contactForm");

    // Stop if this is not the Contact Us page
    if (!form) return;

    const firstName = document.getElementById("firstName");
    const surname = document.getElementById("surname");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");
    const message = document.getElementById("message");

    const successPopup = document.getElementById("successPopup");
    const feedbackMessage = document.getElementById("feedbackMessage");
    const closePopup = document.getElementById("closePopup");


    // DISPLAY ERROR MESSAGE
    function showError(input, errorId, errorMessage) {

        const errorElement = document.getElementById(errorId);

        if (errorElement) {
            errorElement.textContent = errorMessage;
        }

        input.style.border = "2px solid red";
    }


    // CLEAR ERROR MESSAGE
    function clearError(input, errorId) {

        const errorElement = document.getElementById(errorId);

        if (errorElement) {
            errorElement.textContent = "";
        }

        input.style.border = "1px solid green";
    }


    // VALIDATE FIRST NAME
    function validateName() {

        const value = firstName.value.trim();

        if (value === "") {
            showError(firstName, "nameError", "Empty field.");
            return false;
        }

        if (!/^[a-zA-Z\s]+$/.test(value)) {
            showError(firstName, "nameError", "Name must contain letters only.");
            return false;
        }

        clearError(firstName, "nameError");
        return true;
    }


    // VALIDATE SURNAME
    function validateSurname() {

        const value = surname.value.trim();

        if (value === "") {
            showError(surname, "surnameError", "Empty field.");
            return false;
        }

        if (!/^[a-zA-Z\s]+$/.test(value)) {
            showError(surname, "surnameError", "Surname must contain letters only.");
            return false;
        }

        clearError(surname, "surnameError");
        return true;
    }


    // VALIDATE PHONE NUMBER
    function validatePhone() {

        const value = phone.value.trim();

        if (value === "") {
            showError(phone, "phoneError", "Empty field.");
            return false;
        }

        if (!/^[0-9]+$/.test(value)) {
            showError(phone, "phoneError", "Phone number must contain numbers only.");
            return false;
        }

        if (value.length < 10 || value.length > 15) {
            showError(phone, "phoneError", "Phone number must contain 10 to 15 digits.");
            return false;
        }

        clearError(phone, "phoneError");
        return true;
    }


    // VALIDATE EMAIL
    function validateEmail() {

        const value = email.value.trim();

        if (value === "") {
            showError(email, "emailError", "Empty field.");
            return false;
        }

        const emailPattern =
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!emailPattern.test(value)) {
            showError(email, "emailError", "Please enter a valid email address.");
            return false;
        }

        clearError(email, "emailError");
        return true;
    }


    // VALIDATE MESSAGE
    function validateMessage() {

        const value = message.value.trim();

        if (value === "") {
            showError(message, "messageError", "Empty field.");
            return false;
        }

        clearError(message, "messageError");
        return true;
    }


    // CHECK ALL FIELDS WHEN SUBMITTING
    form.addEventListener("submit", function(event) {

        event.preventDefault();

        const nameValid = validateName();
        const surnameValid = validateSurname();
        const phoneValid = validatePhone();
        const emailValid = validateEmail();
        const messageValid = validateMessage();

        if (
            !nameValid ||
            !surnameValid ||
            !phoneValid ||
            !emailValid ||
            !messageValid
        ) {
            return;
        }


        // ALL FIELDS ARE VALID
        if (feedbackMessage) {
            feedbackMessage.textContent =
                `Thank you, ${firstName.value.trim()}! Your message has been submitted successfully.`;
        }

        if (successPopup) {
            successPopup.style.display = "flex";
        }

        form.reset();

        // Reset input borders
        form.querySelectorAll("input, textarea").forEach(input => {
            input.style.border = "1px solid #ccc";
        });

        // Clear error messages
        form.querySelectorAll(".error-message").forEach(error => {
            error.textContent = "";
        });

    });


    // REMOVE ERRORS WHILE TYPING
    firstName.addEventListener("input", validateName);
    surname.addEventListener("input", validateSurname);
    phone.addEventListener("input", validatePhone);
    email.addEventListener("input", validateEmail);
    message.addEventListener("input", validateMessage);


    // CLOSE SUCCESS POPUP
    if (closePopup && successPopup) {

        closePopup.addEventListener("click", function() {
            successPopup.style.display = "none";
        });

    }

}