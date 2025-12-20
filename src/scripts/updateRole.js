import pool from "../config/db.js";

async function updateUserRole() {
    try {
        const result = await pool.query(
            `UPDATE users SET role = $1 WHERE email = $2 RETURNING *`,
            ["businessOwner", "vitharanaps@gmail.com"]
        );

        if (result.rows.length > 0) {
            console.log("✅ User role updated successfully!");
            console.log("User:", result.rows[0]);
        } else {
            console.log("❌ User not found");
        }

        process.exit(0);
    } catch (err) {
        console.error("Error updating role:", err);
        process.exit(1);
    }
}

updateUserRole();
