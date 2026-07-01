// New enquiry form (new_enquiry).
(function () {
  function bind() {
    const root = document.querySelector(".container-enquiry");
    if (!root || !document.getElementById("form-enquiry")) return;

    RbacBind.tagHeaders(root, {
      "#submitEnquiryBtn": "create",
      "#addItemBtn": "create",
      "button[type='submit'].btn-save": "create",
    });
    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  window.RbacRegistry.registerMatcher(
    () => !!document.getElementById("form-enquiry"),
    bind,
    "enquiry-form"
  );
})();
