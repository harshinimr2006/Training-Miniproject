function submitClaim() {

    const item =
        document.getElementById("claimItem").value;

    const reason =
        document.getElementById("claimReason").value;

    const feature =
        document.getElementById("uniqueFeature").value;


    if (
        item === "" ||
        reason === "" ||
        feature === ""
    ) {

        document.getElementById("claimMessage").innerText =
            "Please fill all fields.";

        document.getElementById("claimMessage").style.color =
            "red";

        return;
    }


    const claim = {

        id: Date.now(),

        item: item,

        reason: reason,

        feature: feature,

        status: "Pending",

        date: new Date().toLocaleDateString()

    };


    let claims =
        JSON.parse(localStorage.getItem("claims")) || [];


    claims.push(claim);


    localStorage.setItem(
        "claims",
        JSON.stringify(claims)
    );


    document.getElementById("claimMessage").innerText =
        "Claim submitted successfully!";

    document.getElementById("claimMessage").style.color =
        "green";


    document.getElementById("claimItem").value = "";

    document.getElementById("claimReason").value = "";

    document.getElementById("uniqueFeature").value = "";


    displayClaims();

}


function displayClaims() {

    const container =
        document.getElementById("claimsContainer");


    const claims =
        JSON.parse(localStorage.getItem("claims")) || [];


    container.innerHTML = "";


    if (claims.length === 0) {

        container.innerHTML =
            "<p>No claims submitted yet.</p>";

        return;
    }


    claims.forEach(function(claim) {

        const card =
            document.createElement("div");

        card.className =
            "claim-card";


        card.innerHTML = `

            <h3>${claim.item}</h3>

            <p>
                <strong>Submitted:</strong>
                ${claim.date}
            </p>

            <p>
                <strong>Reason:</strong>
                ${claim.reason}
            </p>

            <p>
                <strong>Unique Feature:</strong>
                ${claim.feature}
            </p>

            <span class="claim-status">
                ${claim.status}
            </span>

        `;


        container.appendChild(card);

    });

}


displayClaims();