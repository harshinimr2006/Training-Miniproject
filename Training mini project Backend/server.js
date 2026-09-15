const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const url = require("url");

// ======================================================
// SERVER CONFIGURATION
// ======================================================

const PORT = 5000;

const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");

const USERS_FILE = path.join(DATA_DIR, "users.json");
const ITEMS_FILE = path.join(DATA_DIR, "items.json");
const CLAIMS_FILE = path.join(DATA_DIR, "claims.json");

// ======================================================
// CREATE REQUIRED FOLDERS AND FILES
// ======================================================

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function createJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]");
    }
}

createJsonFile(USERS_FILE);
createJsonFile(ITEMS_FILE);
createJsonFile(CLAIMS_FILE);

// ======================================================
// DATABASE FUNCTIONS
// ======================================================

function readData(filePath) {
    try {
        const data = fs.readFileSync(filePath, "utf8");

        if (!data.trim()) {
            return [];
        }

        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading:", filePath);
        console.error(error);
        return [];
    }
}

function writeData(filePath, data) {
    try {
        fs.writeFileSync(
            filePath,
            JSON.stringify(data, null, 2)
        );

        return true;
    } catch (error) {
        console.error("Error writing:", filePath);
        console.error(error);
        return false;
    }
}

// ======================================================
// UTILITY FUNCTIONS
// ======================================================

function generateId(prefix) {
    return (
        prefix +
        "_" +
        Date.now() +
        "_" +
        crypto.randomBytes(4).toString("hex")
    );
}

function hashPassword(password) {
    return crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
}

function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}

function sendResponse(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
            "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
            "Content-Type, Authorization"
    });

    res.end(JSON.stringify(data));
}

// ======================================================
// REQUEST BODY
// ======================================================

function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", chunk => {
            body += chunk.toString();
        });

        req.on("end", () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                const data = JSON.parse(body);
                resolve(data);
            } catch (error) {
                reject(new Error("Invalid JSON body"));
            }
        });

        req.on("error", error => {
            reject(error);
        });
    });
}

// ======================================================
// AUTHENTICATION
// ======================================================

// token -> userId
const sessions = {};

// ======================================================
// GET USER FROM TOKEN
// ======================================================

function getUserFromToken(req) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return null;
    }

    if (!authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.substring(7);

    const userId = sessions[token];

    if (!userId) {
        return null;
    }

    const users = readData(USERS_FILE);

    const user = users.find(
        user => user.id === userId
    );

    return user || null;
}

// ======================================================
// CHECK ADMIN
// ======================================================

function requireAdmin(req, res) {
    const user = getUserFromToken(req);

    if (!user) {
        sendResponse(res, 401, {
            success: false,
            message: "Authentication required"
        });

        return null;
    }

    if (user.role !== "admin") {
        sendResponse(res, 403, {
            success: false,
            message: "Admin access required"
        });

        return null;
    }

    return user;
}

// ======================================================
// SERVER
// ======================================================

const server = http.createServer(async (req, res) => {

    // --------------------------------------------------
    // CORS PREFLIGHT
    // --------------------------------------------------

    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods":
                "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers":
                "Content-Type, Authorization"
        });

        res.end();
        return;
    }

    const parsedUrl = url.parse(
        req.url,
        true
    );

    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    try {

        // ==================================================
        // HOME / SERVER STATUS
        // ==================================================

        if (
            req.method === "GET" &&
            pathname === "/"
        ) {

            sendResponse(res, 200, {
                success: true,
                message:
                    "CampusFind Backend Server is running",
                server: "Node.js",
                port: PORT
            });

            return;
        }

        // ==================================================
        // REGISTER
        // ==================================================

        if (
            req.method === "POST" &&
            pathname === "/api/register"
        ) {

            const body = await getRequestBody();

            const {
                name,
                email,
                phone,
                password
            } = body;

            if (
                !name ||
                !email ||
                !phone ||
                !password
            ) {

                sendResponse(res, 400, {
                    success: false,
                    message:
                        "Name, email, phone and password are required"
                });

                return;
            }

            const users = readData(USERS_FILE);

            const existingUser = users.find(
                user =>
                    user.email.toLowerCase() ===
                    email.toLowerCase()
            );

            if (existingUser) {

                sendResponse(res, 409, {
                    success: false,
                    message:
                        "Email already registered"
                });

                return;
            }

            const newUser = {
                id: generateId("USR"),
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                password: hashPassword(password),
                role: "student",
                createdAt: new Date().toISOString()
            };

            users.push(newUser);

            writeData(
                USERS_FILE,
                users
            );

            const safeUser = {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role
            };

            sendResponse(res, 201, {
                success: true,
                message:
                    "Registration successful",
                user: safeUser
            });

            return;
        }

        // ==================================================
        // LOGIN
        // ==================================================

        if (
            req.method === "POST" &&
            pathname === "/api/login"
        ) {

            const body = await getRequestBody();

            const {
                email,
                password
            } = body;

            if (!email || !password) {

                sendResponse(res, 400, {
                    success: false,
                    message:
                        "Email and password are required"
                });

                return;
            }

            const users = readData(USERS_FILE);

            const user = users.find(
                user =>
                    user.email.toLowerCase() ===
                    email.toLowerCase()
            );

            if (!user) {

                sendResponse(res, 401, {
                    success: false,
                    message:
                        "Invalid email or password"
                });

                return;
            }

            const hashedPassword =
                hashPassword(password);

            if (
                user.password !==
                hashedPassword
            ) {

                sendResponse(res, 401, {
                    success: false,
                    message:
                        "Invalid email or password"
                });

                return;
            }

            const token =
                generateToken();

            sessions[token] = user.id;

            const safeUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            };

            sendResponse(res, 200, {
                success: true,
                message: "Login successful",
                token: token,
                user: safeUser
            });

            return;
        }

        // ==================================================
        // LOGOUT
        // ==================================================

        if (
            req.method === "POST" &&
            pathname === "/api/logout"
        ) {

            const authHeader =
                req.headers.authorization;

            if (authHeader) {

                const token =
                    authHeader.replace(
                        "Bearer ",
                        ""
                    );

                delete sessions[token];
            }

            sendResponse(res, 200, {
                success: true,
                message: "Logout successful"
            });

            return;
        }

        // ==================================================
        // CURRENT USER
        // ==================================================

        if (
            req.method === "GET" &&
            pathname === "/api/me"
        ) {

            const user =
                getUserFromToken(req);

            if (!user) {

                sendResponse(res, 401, {
                    success: false,
                    message:
                        "Authentication required"
                });

                return;
            }

            sendResponse(res, 200, {
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role
                }
            });

            return;
        }

        // ==================================================
        // CREATE LOST / FOUND ITEM
        // ==================================================

        if (
            req.method === "POST" &&
            pathname === "/api/items"
        ) {

            const user =
                getUserFromToken(req);

            if (!user) {

                sendResponse(res, 401, {
                    success: false,
                    message:
                        "Please login first"
                });

                return;
            }

            const body =
                await getRequestBody();

            const {
                name,
                category,
                color,
                location,
                date,
                description,
                type
            } = body;

            if (
                !name ||
                !category ||
                !color ||
                !location ||
                !date ||
                !type
            ) {

                sendResponse(res, 400, {
                    success: false,
                    message:
                        "All required item fields must be provided"
                });

                return;
            }

            if (
                type !== "Lost" &&
                type !== "Found"
            ) {

                sendResponse(res, 400, {
                    success: false,
                    message:
                        "Type must be Lost or Found"
                });

                return;
            }

            const items =
                readData(ITEMS_FILE);

            const newItem = {
                id: generateId("ITEM"),

                name: name.trim(),

                category:
                    category.trim(),

                color:
                    color.trim(),

                location:
                    location.trim(),

                date: date,

                description:
                    description
                        ? description.trim()
                        : "",

                type: type,

                status:
                    type === "Lost"
                        ? "Searching"
                        : "Available",

                reportedBy: user.id,

                reporterName:
                    user.name,

                createdAt:
                    new Date().toISOString(),

                returnedTo: null,

                returnedAt: null
            };

            items.push(newItem);

            writeData(
                ITEMS_FILE,
                items
            );

            sendResponse(res, 201, {
                success: true,
                message:
                    `${type} item reported successfully`,
                item: newItem
            });

            return;
        }

        // ==================================================
        // GET ALL ITEMS
        // ==================================================

        if (
            req.method === "GET" &&
            pathname === "/api/items"
        ) {

            let items =
                readData(ITEMS_FILE);

            // Search
            if (query.search) {

                const search =
                    query.search
                        .toLowerCase();

                items = items.filter(item =>
                    item.name
                        .toLowerCase()
                        .includes(search) ||

                    item.category
                        .toLowerCase()
                        .includes(search) ||

                    item.color
                        .toLowerCase()
                        .includes(search) ||

                    item.location
                        .toLowerCase()
                        .includes(search)
                );
            }

            // Filter by type
            if (query.type) {

                items = items.filter(
                    item =>
                        item.type.toLowerCase() ===
                        query.type.toLowerCase()
                );
            }

            // Filter by category
            if (query.category) {

                items = items.filter(
                    item =>
                        item.category.toLowerCase() ===
                        query.category.toLowerCase()
                );
            }

            // Filter by location
            if (query.location) {

                const location =
                    query.location.toLowerCase();

                items = items.filter(item =>
                    item.location
                        .toLowerCase()
                        .includes(location)
                );
            }

            sendResponse(res, 200, {
                success: true,
                count: items.length,
                items: items
            });

            return;
        }

        // ==================================================
        // GET SINGLE ITEM
        // ==================================================

        if (
            req.method === "GET" &&
            pathname.startsWith("/api/items/")
        ) {

            const itemId =
                pathname.split("/")[3];

            const items =
                readData(ITEMS_FILE);

            const item =
                items.find(
                    item =>
                        item.id === itemId
                );

            if (!item) {

                sendResponse(res, 404, {
                    success: false,
                    message:
                        "Item not found"
                });

                return;
            }

            sendResponse(res, 200, {
                success: true,
                item: item
            });

            return;
        }

        // ==================================================
        // UPDATE ITEM
        // ==================================================

        if (
            req.method === "PUT" &&
            pathname.startsWith("/api/items/")
        ) {

            const user =
                getUserFromToken(req);

            if (!user) {

                sendResponse(res, 401, {
                    success: false,
                    message:
                        "Authentication required"
                });

                return;
            }

            const itemId =
                pathname.split("/")[3];

            const items =
                readData(ITEMS_FILE);

            const itemIndex =
                items.findIndex(
                    item =>
                        item.id === itemId
                );

            if (itemIndex === -1) {

                sendResponse(res, 404, {
                    success: false,
                    message:
                        "Item not found"
                });

                return;
            }

            const item =
                items[itemIndex];

            if (
                item.reportedBy !== user.id &&
                user.role !== "admin"
            ) {

                sendResponse(res, 403, {
                    success: false,
                    message:
                        "You cannot update this item"
                });

                return;
            }

            const body =
                await getRequestBody();

            const updatedItem = {
                ...item,

                name:
                    body.name ??
                    item.name,

                category:
                    body.category ??
                    item.category,

                color:
                    body.color ??
                    item.color,

                location:
                    body.location ??
                    item.location,

                date:
                    body.date ??
                    item.date,

                description:
                    body.description ??
                    item.description,

                status:
                    body.status ??
                    item.status,

                updatedAt:
                    new Date().toISOString()
            };

            items[itemIndex] =
                updatedItem;

            writeData(
                ITEMS_FILE,
                items
            );

            sendResponse(res, 200, {
                success: true,
                message:
                    "Item updated successfully",
                item: updatedItem
            });

            return;
        }

        // ==================================================
        // DELETE ITEM
        // ==================================================

        if (
            req.method === "DELETE" &&
            pathname.startsWith("/api/items/")
        ) {

            const user =
                getUserFromToken(req);

            if (!user) {

                sendResponse(res, 401, {
                    success: false,
                    message:
                        "Authentication required"
                });

                return;
            }

            const itemId =
                pathname.split("/")[3];

            const items =
                readData(ITEMS_FILE);

            const item =
                items.find(
                    item =>
                        item.id === itemId
                );

            if (!item) {

                sendResponse(res, 404, {
                    success: false,
                    message:
                        "Item not found"
                });

                return;
            }

            if (
                item.reportedBy !== user.id &&
                user.role !== "admin"
            ) {

                sendResponse(res, 403, {
                    success: false,
                    message:
                        "You cannot delete this item"
                });

                return;
            }

            const updatedItems =
                items.filter(
                    item =>
                        item.id !== itemId
                );

            writeData(
                ITEMS_FILE,
                updatedItems
            );

            sendResponse(res, 200, {
                success: true,
                message:
                    "Item deleted successfully"
            });

            return;
        }

        // ==================================================
        // SUBMIT CLAIM
        // ==================================================

        if (
            req.method === "POST" &&
            pathname === "/api/claims"
        ) {

            const user =
                getUserFromToken(req);

            if (!user) {

                sendResponse(res, 401, {
                    success: false,
                    message:
                        "Please login first"
                });

                return;
            }

            const body =
                await getRequestBody();

            const {
                itemId,
                reason,
                uniqueFeature
            } = body;

            if (
                !itemId ||
                !reason ||
                !uniqueFeature
            ) {

                sendResponse(res, 400, {
                    success: false,
                    message:
                        "Item ID, reason and ownership proof are required"
                });

                return;
            }

            const items =
                readData(ITEMS_FILE);

            const item =
                items.find(
                    item =>
                        item.id === itemId
                );

            if (!item) {

                sendResponse(res, 404, {
                    success: false,
                    message:
                        "Item not found"
                });

                return;
            }

            const claims =
                readData(CLAIMS_FILE);

            const existingClaim =
                claims.find(
                    claim =>
                        claim.itemId === itemId &&
                        claim.userId === user.id &&
                        claim.status === "Pending"
                );

            if (existingClaim) {

                sendResponse(res, 409, {
                    success: false,
                    message:
                        "You already have a pending claim for this item"
                });

                return;
            }

            const newClaim = {

                id:
                    generateId("CLM"),

                itemId:
                    itemId,

                itemName:
                    item.name,

                userId:
                    user.id,

                userName:
                    user.name,

                userEmail:
                    user.email,

                reason:
                    reason.trim(),

                uniqueFeature:
                    uniqueFeature.trim(),

                status:
                    "Pending",

                createdAt:
                    new Date().toISOString(),

                reviewedAt:
                    null
            };

            claims.push(newClaim);

            writeData(
                CLAIMS_FILE,
                claims
            );

            sendResponse(res, 201, {
                success: true,
                message:
                    "Claim submitted successfully",
                claim: newClaim
            });

            return;
        }

        // ==================================================
        // GET CLAIMS
        // ==================================================

        if (
            req.method === "GET" &&
            pathname === "/api/claims"
        ) {

            const user =
                getUserFromToken(req);

            if (!user) {

                sendResponse(res, 401, {
                    success: false,
                    message:
                        "Authentication required"
                });

                return;
            }

            const claims =
                readData(CLAIMS_FILE);

            let userClaims;

            if (user.role === "admin") {
                userClaims = claims;
            } else {
                userClaims =
                    claims.filter(
                        claim =>
                            claim.userId ===
                            user.id
                    );
            }

            sendResponse(res, 200, {
                success: true,
                count:
                    userClaims.length,
                claims:
                    userClaims
            });

            return;
        }

        // ==================================================
        // GET SINGLE CLAIM
        // ==================================================

        if (
            req.method === "GET" &&
            pathname.startsWith("/api/claims/")
        ) {

            const user =
                getUserFromToken(req);

            if (!user) {

                sendResponse(res, 401, {
                    success: false,
                    message:
                        "Authentication required"
                });

                return;
            }

            const claimId =
                pathname.split("/")[3];

            const claims =
                readData(CLAIMS_FILE);

            const claim =
                claims.find(
                    claim =>
                        claim.id === claimId
                );

            if (!claim) {

                sendResponse(res, 404, {
                    success: false,
                    message:
                        "Claim not found"
                });

                return;
            }

            if (
                claim.userId !== user.id &&
                user.role !== "admin"
            ) {

                sendResponse(res, 403, {
                    success: false,
                    message:
                        "You cannot view this claim"
                });

                return;
            }

            sendResponse(res, 200, {
                success: true,
                claim: claim
            });

            return;
        }

        // ==================================================
        // ADMIN - GET ALL ITEMS
        // ==================================================

        if (
            req.method === "GET" &&
            pathname === "/api/admin/items"
        ) {

            const admin =
                requireAdmin(req, res);

            if (!admin) {
                return;
            }

            const items =
                readData(ITEMS_FILE);

            sendResponse(res, 200, {
                success: true,
                count: items.length,
                items: items
            });

            return;
        }

        // ==================================================
        // ADMIN - GET ALL CLAIMS
        // ==================================================

        if (
            req.method === "GET" &&
            pathname === "/api/admin/claims"
        ) {

            const admin =
                requireAdmin(req, res);

            if (!admin) {
                return;
            }

            const claims =
                readData(CLAIMS_FILE);

            sendResponse(res, 200, {
                success: true,
                count: claims.length,
                claims: claims
            });

            return;
        }

        // ==================================================
        // ADMIN - APPROVE / REJECT CLAIM
        // ==================================================

        if (
            req.method === "PUT" &&
            pathname.startsWith(
                "/api/admin/claims/"
            )
        ) {

            const admin =
                requireAdmin(req, res);

            if (!admin) {
                return;
            }

            const claimId =
                pathname.split("/")[4];

            const body =
                await getRequestBody();

            const {
                status
            } = body;

            if (
                status !== "Approved" &&
                status !== "Rejected"
            ) {

                sendResponse(res, 400, {
                    success: false,
                    message:
                        "Status must be Approved or Rejected"
                });

                return;
            }

            const claims =
                readData(CLAIMS_FILE);

            const claimIndex =
                claims.findIndex(
                    claim =>
                        claim.id === claimId
                );

            if (claimIndex === -1) {

                sendResponse(res, 404, {
                    success: false,
                    message:
                        "Claim not found"
                });

                return;
            }

            claims[claimIndex].status =
                status;

            claims[claimIndex].reviewedAt =
                new Date().toISOString();

            claims[claimIndex].reviewedBy =
                admin.id;

            writeData(
                CLAIMS_FILE,
                claims
            );

            // ----------------------------------------------
            // If claim is approved, mark item as returned
            // ----------------------------------------------

            if (status === "Approved") {

                const items =
                    readData(ITEMS_FILE);

                const itemIndex =
                    items.findIndex(
                        item =>
                            item.id ===
                            claims[claimIndex].itemId
                    );

                if (itemIndex !== -1) {

                    items[itemIndex].status =
                        "Returned";

                    items[itemIndex].returnedTo =
                        claims[claimIndex].userId;

                    items[itemIndex].returnedToName =
                        claims[claimIndex].userName;

                    items[itemIndex].returnedAt =
                        new Date().toISOString();

                    writeData(
                        ITEMS_FILE,
                        items
                    );
                }
            }

            sendResponse(res, 200, {
                success: true,
                message:
                    `Claim ${status.toLowerCase()} successfully`,
                claim:
                    claims[claimIndex]
            });

            return;
        }

        // ==================================================
        // ADMIN STATISTICS
        // ==================================================

        if (
            req.method === "GET" &&
            pathname === "/api/admin/stats"
        ) {

            const admin =
                requireAdmin(req, res);

            if (!admin) {
                return;
            }

            const users =
                readData(USERS_FILE);

            const items =
                readData(ITEMS_FILE);

            const claims =
                readData(CLAIMS_FILE);

            const lostItems =
                items.filter(
                    item =>
                        item.type === "Lost"
                );

            const foundItems =
                items.filter(
                    item =>
                        item.type === "Found"
                );

            const returnedItems =
                items.filter(
                    item =>
                        item.status === "Returned"
                );

            const pendingClaims =
                claims.filter(
                    claim =>
                        claim.status === "Pending"
                );

            sendResponse(res, 200, {

                success: true,

                stats: {

                    totalUsers:
                        users.length,

                    totalItems:
                        items.length,

                    lostItems:
                        lostItems.length,

                    foundItems:
                        foundItems.length,

                    returnedItems:
                        returnedItems.length,

                    pendingClaims:
                        pendingClaims.length
                }
            });

            return;
        }

        // ==================================================
        // 404
        // ==================================================

        sendResponse(res, 404, {
            success: false,
            message:
                "API endpoint not found"
        });

    } catch (error) {

        console.error(
            "SERVER ERROR:",
            error
        );

        sendResponse(res, 500, {
            success: false,
            message:
                "Internal server error"
        });
    }
});

// ======================================================
// START SERVER
// ======================================================

server.listen(
    PORT,
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "       CAMPUSFIND BACKEND SERVER"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Server running at: http://localhost:${PORT}`
        );

        console.log(
            "Backend: Node.js"
        );

        console.log(
            "Storage: JSON files"
        );

        console.log(
            "Status: READY"
        );

        console.log(
            "========================================"
        );
    }
);