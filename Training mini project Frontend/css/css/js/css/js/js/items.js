// LOST ITEM FORM

const lostForm =
    document.getElementById("lostForm");

if (lostForm) {

    lostForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const item = {

            id: Date.now(),

            name:
                document.getElementById("itemName").value,

            category:
                document.getElementById("category").value,

            color:
                document.getElementById("color").value,

            location:
                document.getElementById("location").value,

            date:
                document.getElementById("dateLost").value,

            description:
                document.getElementById("description").value,

            type: "Lost",

            status: "Searching"

        };


        let items =
            JSON.parse(localStorage.getItem("items")) || [];


        items.push(item);


        localStorage.setItem(
            "items",
            JSON.stringify(items)
        );


        document.getElementById("lostMessage").innerText =
            "Lost item reported successfully!";

        document.getElementById("lostMessage").style.color =
            "green";


        lostForm.reset();

    });

}



// FOUND ITEM FORM

const foundForm =
    document.getElementById("foundForm");

if (foundForm) {

    foundForm.addEventListener("submit", function(event) {

        event.preventDefault();


        const item = {

            id: Date.now(),

            name:
                document.getElementById("foundName").value,

            category:
                document.getElementById("foundCategory").value,

            color:
                document.getElementById("foundColor").value,

            location:
                document.getElementById("foundLocation").value,

            date:
                document.getElementById("dateFound").value,

            description:
                document.getElementById("foundDescription").value,

            type: "Found",

            status: "Available"

        };


        let items =
            JSON.parse(localStorage.getItem("items")) || [];


        items.push(item);


        localStorage.setItem(
            "items",
            JSON.stringify(items)
        );


        document.getElementById("foundMessage").innerText =
            "Found item reported successfully!";

        document.getElementById("foundMessage").style.color =
            "green";


        foundForm.reset();

    });

}