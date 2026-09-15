const recentItems = [

    {
        name: "Black Wallet",
        category: "Accessories",
        location: "Library",
        date: "10 September 2026",
        type: "Lost"
    },

    {
        name: "Blue Water Bottle",
        category: "Bottle",
        location: "Canteen",
        date: "9 September 2026",
        type: "Found"
    },

    {
        name: "Wireless Earbuds",
        category: "Electronics",
        location: "Block A",
        date: "8 September 2026",
        type: "Lost"
    }

];


const container =
    document.getElementById("recentItems");


recentItems.forEach(function(item) {

    const card =
        document.createElement("div");

    card.className = "item-card";

    card.innerHTML = `

        <h3>${item.name}</h3>

        <p>
            <strong>Category:</strong>
            ${item.category}
        </p>

        <p>
            <strong>Location:</strong>
            ${item.location}
        </p>

        <p>
            <strong>Date:</strong>
            ${item.date}
        </p>

        <span class="status">
            ${item.type}
        </span>

    `;

    container.appendChild(card);

});


function logout() {

    localStorage.removeItem("loggedIn");

    window.location.href = "login.html";
}