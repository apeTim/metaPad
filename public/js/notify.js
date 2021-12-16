const colors = {
    "success": "linear-gradient(to right, #00b09b, #96c93d)",
    "warning": "linear-gradient(to right, #d37903, #ff9100)",
    "error": "linear-gradient(to right, #a12101, #ff2600)"
}
function notify(message, status) {
    Toastify({
        text: message,
        className: "info",
        duration: 2500,
        style: {
            background: colors[status],
        }
    }).showToast();
}