const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const {executeQuery} = require("./utils");
app.use(express.urlencoded({ extended: true }));

const port = 3000;
const base_url = "/api";
const secret = "soal_tes_backend_intersolusi_teknologi_asia";

function CekToken(req, res, next) {
    const token = req.headers["x-auth-token"];
    if (!token) {
        return res.status(401).send({
            "Pesan": "Token tidak ditemukan!"
        });
    }
    try {
        req.dataUser = jwt.verify(token, secret);
        next();
    }
    catch (err) {
        return res.status(400).send(err);
    }
}

function CekParamChecklistID(req, res, next) {
    const schema =  Joi.object({
        "checklistId": Joi.number().required().messages({
            "any.required": "ChecklistID harus disertakan!"
        })
    });
    const validationResult = schema.validate(req.param);
    if (validationResult.error) {
        return res.status(400).send({"Pesan": validationResult.error.details[0].message});
    }
    next();
}

function CekParamChecklistItemID(req, res, next) {
    const schema =  Joi.object({
        "checklistItemId": Joi.required().messages({
            "any.required": "ChecklistItemID harus disertakan!"
        })
    });
    const validationResult = schema.validate(req.param);
    if (validationResult.error) {
        return res.status(400).send({"Pesan": validationResult.error.details[0].message});
    }
    next();
}

async function CekChecklistMilikUser(req, res, next) {
    try {
        const checklistId = req.params.checklistId;
        const hasil = await executeQuery(`SELECT * FROM checklist WHERE checklistId = "${checklistId}"`);
        if (hasil.length > 0) {
            const checklist = hasil[0];
            const user = jwt.decode(req.headers["x-auth-token"]);
            if (checklist.username != user.username) {
                return res.status(401).send({"Pesan": "Anda tidak dapat mengakses checklist tersebut!"});
            }
        }
        next();
    }
    catch (error) {
        return res.status(500).send(err);
    }
}

async function CekChecklistItemMilikUser(req, res, next) {
    try {
        const checklistId = req.params.checklistId;
        const checklistItemId = req.params.checklistItemId;
        const hasil = await executeQuery(`SELECT * FROM checklist WHERE checklistId = "${checklistId}"`);
        if (hasil.length == 0) {
            return res.status(200).send({"Pesan": "Checklist tidak ditemukan!"});
        }
        const checklist = hasil[0];
        const user = jwt.decode(req.headers["x-auth-token"]);
        if (checklist.username != user.username) {
            return res.status(401).send({"Pesan": "Anda tidak dapat mengakses checklist tersebut!"});
        }
        hasil = await executeQuery(`SELECT * FROM checklist_item WHERE checklistId = "${checklistId}" AND checklistItemId = "${checklistItemId}"`);
        if (hasil.length == 0) {
            return res.status(200).send({"Pesan": "Anda tidak dapat mengakses checklist item tersebut!"});
        }
        next();
    }
    catch (error) {
        return res.status(500).send(err);
    }
}

app.post(`${base_url}/login`, async function (req, res) {
    const schema =  Joi.object({
        "password": Joi.string().required().messages({
            "any.required": "Password harus disertakan!",
            "string.empty": "Password wajib diisi!"
        }),
        "username": Joi.string().required().messages({
            "any.required": "Username harus disertakan!",
            "string.empty": "Username wajib diisi!"
        })
    });
    const validationResult = schema.validate(req.body);
    if (validationResult.error) {
        return res.status(400).send({"Pesan": validationResult.error.details[0].message});
    }
    try {
        const password = req.body.password;
        const username = req.body.username;
        const hasil = await executeQuery(`SELECT * FROM user WHERE username = "${username}"`);
        if (hasil.length == 0) {
            return res.status(200).send({"Pesan": "User tidak ditemukan!"});
        }
        const user = hasil[0];
        if (user.password == password) {
            const token = jwt.sign(
                {
                    "email": user.email,
                    "username": user.username
                },
                secret,
                {
                    "expiresIn" : 3600
                }
            );
            return res.status(200).send({"token": token});
        }
        return res.status(200).send({"Pesan": "Password salah!"});
    }
    catch (err) {
        return res.status(500).send(err);
    }
})

app.post(`${base_url}/register`, async function (req, res) {
    const schema =  Joi.object({
        "email": Joi.string().email().required().messages({
            "any.required": "Email harus disertakan!",
            "string.empty": "Email wajib diisi!",
            "string.email": "Email harus valid!"
        }),
        "password": Joi.string().required().messages({
            "any.required": "Password harus disertakan!",
            "string.empty": "Password wajib diisi!"
        }),
        "username": Joi.string().required().messages({
            "any.required": "Username harus disertakan!",
            "string.empty": "Username wajib diisi!"
        })
    });
    const validationResult = schema.validate(req.body);
    if (validationResult.error) {
        return res.status(400).send({"Pesan": validationResult.error.details[0].message});
    }
    try {
        const email = req.body.email;
        const password = req.body.password;
        const username = req.body.username;
        const hasil = await executeQuery(`SELECT * FROM user WHERE username = "${username}"`);
        if (hasil.length > 0) {
            return res.status(200).send({"Pesan": "User sudah ada!"});
        }
        await executeQuery(`INSERT INTO User VALUES ("${username}", "${email}", "${password}")`);
        return res.status(200).send({"Pesan": "User berhasil ditambahkan!"});
    }
    catch (err) {
        return res.status(500).send(err);
    }
});

app.get(`${base_url}/checklist`, CekToken, async function (req, res) {
    try {
        const hasil = await executeQuery("SELECT * FROM checklist");
        return res.status(200).send(hasil);
    }
    catch (err) {
        return res.status(500).send(err);
    }
});

app.post(`${base_url}/checklist`, CekToken, async function (req, res) {
    const schema =  Joi.object({
        "name": Joi.string().required().messages({
            "any.required": "Name harus disertakan!",
            "string.empty": "Name wajib diisi!"
        })
    });
    const validationResult = schema.validate(req.body);
    if (validationResult.error) {
        return res.status(400).send({"Pesan": validationResult.error.details[0].message});
    }
    try {
        const name = req.body.name;
        const user = jwt.decode(req.headers["x-auth-token"]);
        await executeQuery(`INSERT INTO checklist VALUES (0, "${name}", "${user.username}")`);
        return res.status(200).send({"Pesan": "Checklist berhasil ditambahkan!"});
    }
    catch (err) {
        return res.status(500).send(err);
    }
});

app.delete(`${base_url}/checklist/:checklistId`, CekToken, CekParamChecklistID, CekChecklistMilikUser, async function (req, res) {
    try {
        const checklistId = req.params.checklistId;
        await executeQuery(`DELETE FROM checklist WHERE checklistId = ${checklistId}`);
        return res.status(200).send({"Pesan": "Checklist berhasil dihapus!"});
    }
    catch (err) {
        return res.status(500).send(err);
    }
});


app.get(`${base_url}/checklist/:checklistId/item`, CekToken, CekParamChecklistID, CekChecklistMilikUser, async function (req, res) {
    try {
        const checklistId = req.params.checklistId;
        const hasil = await executeQuery(`SELECT * FROM checklist_item WHERE checklistId = "${checklistId}")`);
        return res.status(200).send(hasil);
    }
    catch (err) {
        return res.status(500).send(err);
    }
});

app.post(`${base_url}/checklist/:checklistId/item`, CekToken, CekParamChecklistID, CekChecklistMilikUser, async function (req, res) {
    const schema =  Joi.object({
        "itemName": Joi.string().required().messages({
            "any.required": "ItemName harus disertakan!",
            "string.empty": "ItemName wajib diisi!"
        })
    });
    const validationResult = schema.validate(req.body);
    if (validationResult.error) {
        return res.status(400).send({"Pesan": validationResult.error.details[0].message});
    }
    try {
        const checklistId = req.params.checklistId;
        const itemName = req.body.itemName;
        await executeQuery(`INSERT INTO checklist_item VALUES (0, "${itemName}", 0, ${checklistId})`);
        return res.status(200).send({"Pesan": "Checklist berhasil ditambahkan!"});
    }
    catch (err) {
        return res.status(500).send(err);
    }
});

app.get(`${base_url}/checklist/:checklistId/item/:checklistItemId`, CekToken, CekParamChecklistID, CekParamChecklistItemID, CekChecklistMilikUser, CekChecklistItemMilikUser, async function (req, res) {
    try {
        const checklistId = req.params.checklistId;
        const checklistItemId = req.params.checklistItemId;
        const hasil = await executeQuery(`SELECT * FROM checklist_item WHERE checklistId = ${checklistId} AND checklistItemId = ${checklistItemId}`);
        return res.status(200).send(hasil);
    }
    catch (err) {
        return res.status(500).send(err);
    }
});

app.put(`${base_url}/checklist/:checklistId/item/:checklistItemId`, CekToken, CekParamChecklistID, CekParamChecklistItemID, CekChecklistMilikUser, CekChecklistItemMilikUser, async function (req, res) {
    try {
        const checklistId = req.params.checklistId;
        const checklistItemId = req.params.checklistItemId;
        const hasil = await executeQuery(`SELECT * FROM checklist_item WHERE checklistId = ${checklistId} AND checklistItemId = ${checklistItemId}`);
        const checklistItem = hasil[0];
        await executeQuery(`UPDATE checklist_item SET status = ${1 - checklistItem.status} WHERE checklistId = ${checklistId} AND checklistItemId = ${checklistItemId}`);
        return res.status(200).send({"Pesan": "Status Checklist Item berhasil diubah!"});
    }
    catch (err) {
        return res.status(500).send(err);
    }
});

app.delete(`${base_url}/checklist/:checklistId/item/:checklistItemId`, CekToken, CekParamChecklistID, CekParamChecklistItemID, CekChecklistMilikUser, CekChecklistItemMilikUser, async function (req, res) {
    try {
        const checklistId = req.params.checklistId;
        const checklistItemId = req.params.checklistItemId;
        await executeQuery(`DELETE FROM checklist_item WHERE checklistId = ${checklistId} AND checklistItemId = ${checklistItemId}`);
        return res.status(200).send({"Pesan": "Checklist Item berhasil dihapus!"});
    }
    catch (err) {
        return res.status(500).send(err);
    }
});

app.put(`${base_url}/checklist/:checklistId/item/:checklistItemId`, CekToken, CekParamChecklistID, CekParamChecklistItemID, CekChecklistMilikUser, CekChecklistItemMilikUser, async function (req, res) {
    try {
        const checklistId = req.params.checklistId;
        const checklistItemId = req.params.checklistItemId;
        const hasil = await executeQuery(`SELECT * FROM checklist_item WHERE checklistId = ${checklistId} AND checklistItemId = ${checklistItemId}`);
        const checklistItem = hasil[0];
        await executeQuery(`UPDATE checklist_item SET itemName = ${checklistItem.itemName} WHERE checklistId = ${checklistId} AND checklistItemId = ${checklistItemId}`);
        return res.status(200).send({"Pesan": "Checklist Item berhasil diubah!"});
    }
    catch (err) {
        return res.status(500).send(err);
    }
});

app.listen(port, function(){
    console.log(`Listening on port ${port}...`);
});