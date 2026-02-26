const sequelize = require('../../config/database');
const { Op } = require('sequelize');
const checkSocketPermission = require("../../middleware/checkSocketPermission");
const NewSghaTemplate = require('../../NewModels/NewSghaTemplate');
const MainAgreement = require('../../NewModels/MainAgreement');
const MainAgreementSection = require('../../NewModels/MainAgreementSection');
const Annex = require('../../NewModels/Annex');
const AnnexSection = require('../../NewModels/AnnexSection');
const AnnexTableRow = require('../../NewModels/AnnexTableRow');
module.exports = (io, socket) => {
    socket.on("add-full-sgha", async ({ role_id, page_name, template, main_agreement, annex }) => {
        const { allowed, error } = await checkSocketPermission(role_id, "add", page_name);
        if (!allowed) {
            return socket.emit("add-full-sgha-error", { message: error });
        }

        let transaction;
        try {
            transaction = await sequelize.transaction();

            // 1️⃣ Create SGHA Template
            const createdTemplate = await NewSghaTemplate.create({
                template_name: template.template_name,
                template_year: template.template_year
            }, { transaction });

            // 2️⃣ Create Main Agreement
            const createdMainAgreement = await MainAgreement.create({
                SGHA_Template_id: createdTemplate.SGHA_Template_id,
                Main_template_name: main_agreement.Main_template_name
            }, { transaction });

            // 3️⃣ Create Annex (only one per template)
            const createdAnnex = await Annex.create({
                st_id: createdTemplate.SGHA_Template_id,
                annex_header: annex.annex_header
            }, { transaction });

            await transaction.commit();

            const response = {
                template: createdTemplate,
                main_agreement: createdMainAgreement,
                annex: createdAnnex
            };

            io.emit("full-sgha-updated", response);
            socket.emit("add-full-sgha-success", response);

        } catch (err) {
            if (transaction) await transaction.rollback();
            console.error("❌ Failed to add full SGHA:", err);
            socket.emit("add-full-sgha-error", { message: "Failed to add full SGHA", error: err.message });
        }
        finally {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
        }
    });

    socket.on("add_main_agreement_section", async ({ role_id, page_name, ma_id, mainsection }) => {
        const { allowed, error } = await checkSocketPermission(role_id, "add", page_name);
        if (!allowed) {
            return socket.emit("add-main-agreement-section-error", { message: error });
        }

        let transaction;
        try {
            transaction = await sequelize.transaction();
            // 4️⃣ Create Annex Sections + Table Rows
            let createdSections = [];
            if (mainsection.sections && mainsection.sections.length > 0) {
                for (const section of mainsection.sections) {
                    const createdSection = await MainAgreementSection.create({
                        ma_id,
                        section_type: section.section_type,
                        section_body: section.section_body
                    }, { transaction });
                    createdSections.push({ section: createdSection });
                }
            }

            await transaction.commit();

            const response = {
                sections: createdSections
            };
            io.emit("full-sgha-updated", response);
            io.emit("add-main-agreement-section-updated", response);
            socket.emit("add-main-agreement-section-success", response);

        } catch (err) {
            if (transaction) await transaction.rollback();
            console.error("❌ Failed to add full SGHA:", err);
            socket.emit("aadd-main-agreement-section-error", { message: "Failed to add full SGHA", error: err.message });
        }
        finally {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
        }
    });



    // 🔹 Add Annexure Sections + Table Rows
    socket.on("add-annexure-sections", async ({ role_id, page_name, annex_id, sections }) => {
        const { allowed, error } = await checkSocketPermission(role_id, "add", page_name);
        if (!allowed) {
            return socket.emit("add-annexure-sections-error", { message: error });
        }

        let transaction;
        try {
            transaction = await sequelize.transaction();

            // ✅ Validate annexure exists
            const annex = await Annex.findByPk(annex_id, { transaction });
            if (!annex) {
                await transaction.rollback();
                return socket.emit("add-annexure-sections-error", { message: "Annexure not found." });
            }

            // ✅ Create sections and rows
            let createdSections = [];
            for (const section of sections) {
                const createdSection = await AnnexSection.create({
                    annex_id,
                    section_type: section.section_type,
                    section_body: section.section_body
                }, { transaction });

                let createdRows = [];
                if (section.table_rows && section.table_rows.length > 0) {
                    for (const row of section.table_rows) {
                        const createdRow = await AnnexTableRow.create({
                            annx_sec_id: createdSection.annx_sec_id,
                            section: row.section,
                            description: row.description
                        }, { transaction });
                        createdRows.push(createdRow);
                    }
                }

                createdSections.push({ section: createdSection, rows: createdRows });
            }

            await transaction.commit();

            const response = {
                annex,
                sections: createdSections
            };
            io.emit("full-sgha-updated", response);
            io.emit("annexure-sections-updated", response); // broadcast update
            socket.emit("add-annexure-sections-success", response);

        } catch (err) {
            if (transaction) await transaction.rollback();
            console.error("❌ Failed to add annexure sections:", err);
            socket.emit("add-annexure-sections-error", {
                message: "Failed to add annexure sections",
                error: err.message
            });
        }
    });


    socket.on("update_main_agreement_section", async ({ role_id, page_name, mas_id, updatedData }) => {
        const { allowed, error } = await checkSocketPermission(role_id, "edit", page_name);
        if (!allowed) {
            return socket.emit("update-main-agreement-section-error", { message: error });
        }

        let transaction;
        try {
            transaction = await sequelize.transaction();

            // 1️⃣ Find the section by ID
            const section = await MainAgreementSection.findByPk(mas_id, { transaction });
            if (!section) {
                await transaction.rollback();
                return socket.emit("update-main-agreement-section-error", { message: "Section not found" });
            }

            // 2️⃣ Update allowed fields
            await section.update(
                {
                    section_type: updatedData.section_type ?? section.section_type,
                    section_body: updatedData.section_body ?? section.section_body
                },
                { transaction }
            );

            await transaction.commit();

            const response = {
                updatedSection: section
            };

            // 3️⃣ Emit events for all listeners
            io.emit("full-sgha-updated", response);
            io.emit("update-main-agreement-section-updated", response);
            socket.emit("update-main-agreement-section-success", response);

        } catch (err) {
            if (transaction) await transaction.rollback();
            console.error("❌ Failed to update main agreement section:", err);
            socket.emit("update-main-agreement-section-error", {
                message: "Failed to update section",
                error: err.message
            });
        } finally {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
        }
    });


    // 🔹 Update Annexure Section
    socket.on("update-annexure-section", async ({ role_id, page_name, annx_sec_id, updatedData }) => {
        const { allowed, error } = await checkSocketPermission(role_id, "edit", page_name);
        if (!allowed) {
            return socket.emit("update-annexure-section-error", { message: error });
        }

        let transaction;
        try {
            transaction = await sequelize.transaction();

            // ✅ Find section
            const section = await AnnexSection.findByPk(annx_sec_id, { transaction });
            if (!section) {
                await transaction.rollback();
                return socket.emit("update-annexure-section-error", { message: "Annexure Section not found." });
            }

            // ✅ Update section fields
            await section.update(
                {
                    section_type: updatedData.section_type ?? section.section_type,
                    section_body: updatedData.section_body ?? section.section_body
                },
                { transaction }
            );

            await transaction.commit();

            const response = { updatedSection: section };
            io.emit("full-sgha-updated", response);
            io.emit("annexure-section-updated", response);
            socket.emit("update-annexure-section-success", response);

        } catch (err) {
            if (transaction) await transaction.rollback();
            console.error("❌ Failed to update annexure section:", err);
            socket.emit("update-annexure-section-error", {
                message: "Failed to update annexure section",
                error: err.message
            });
        } finally {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
        }
    });


    // 🔹 Update Annexure Table Row
    socket.on("update-annexure-table-row", async ({ role_id, page_name, row_id, updatedData }) => {
        const { allowed, error } = await checkSocketPermission(role_id, "edit", page_name);
        if (!allowed) {
            return socket.emit("update-annexure-table-row-error", { message: error });
        }

        let transaction;
        try {
            transaction = await sequelize.transaction();

            // ✅ Find table row
            const row = await AnnexTableRow.findByPk(row_id, { transaction });
            if (!row) {
                await transaction.rollback();
                return socket.emit("update-annexure-table-row-error", { message: "Annexure Table Row not found." });
            }

            // ✅ Update table row fields
            await row.update(
                {
                    section: updatedData.section ?? row.section,
                    description: updatedData.description ?? row.description
                },
                { transaction }
            );

            await transaction.commit();

            const response = { updatedRow: row };
            io.emit("full-sgha-updated", response);
            io.emit("annexure-table-row-updated", response);
            socket.emit("update-annexure-table-row-success", response);

        } catch (err) {
            if (transaction) await transaction.rollback();
            console.error("❌ Failed to update annexure table row:", err);
            socket.emit("update-annexure-table-row-error", {
                message: "Failed to update annexure table row",
                error: err.message
            });
        } finally {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
        }
    });



    socket.on("fetch-full-sgha", async ({ role_id, page_name, sgha_template_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, "view", page_name);
        if (!allowed) {
            return socket.emit("fetch-full-sgha-error", { message: error });
        }

        try {
            // ✅ Fetch one SGHA Template by PK
            const template = await NewSghaTemplate.findByPk(sgha_template_id, {
                include: [
                    {
                        model: MainAgreement,
                        as: "mainAgreements",
                        include: [
                            {
                                model: MainAgreementSection,
                                as: "sections",
                            },
                        ],
                    },
                    {
                        model: Annex,
                        as: "annexes",
                        include: [
                            {
                                model: AnnexSection,
                                as: "sections",
                                include: [
                                    {
                                        model: AnnexTableRow,
                                        as: "tableRows",
                                    },
                                ],
                            },
                        ],
                    },
                ],
                order: [
                    [{ model: MainAgreement, as: "mainAgreements" }, "createdAt", "ASC"],
                    [
                        { model: MainAgreement, as: "mainAgreements" },
                        { model: MainAgreementSection, as: "sections" },
                        "createdAt",
                        "ASC",
                    ],
                    [{ model: Annex, as: "annexes" }, "createdAt", "ASC"],
                    [
                        { model: Annex, as: "annexes" },
                        { model: AnnexSection, as: "sections" },
                        "createdAt",
                        "ASC",
                    ],
                    [
                        { model: Annex, as: "annexes" },
                        { model: AnnexSection, as: "sections" },
                        { model: AnnexTableRow, as: "tableRows" },
                        "createdAt",
                        "ASC",
                    ],
                ],
            });

            if (!template) {
                return socket.emit("fetch-full-sgha-error", {
                    message: `SGHA Template with ID ${sgha_template_id} not found.`,
                });
            }

            socket.emit("fetch-full-sgha-success", template);
        } catch (err) {
            console.error("❌ Failed to fetch SGHA template:", err);
            socket.emit("fetch-full-sgha-error", {
                message: "Failed to fetch SGHA template",
                error: err.message,
            });
        }
    });



    socket.on("fetch-basic-sgha", async ({ role_id, page_name, sgha_template_id }) => {
        const { allowed, error } = await checkSocketPermission(role_id, "view", page_name);
        if (!allowed) {
            return socket.emit("fetch-basic-sgha-error", { message: error });
        }

        try {
            // ✅ Fetch ALL templates (optionally filtered)
            const templates = await NewSghaTemplate.findAll({
                include: [
                    {
                        model: MainAgreement,
                        as: "mainAgreements",
                    },
                    {
                        model: Annex,
                        as: "annexes",
                    },
                ],
                order: [["createdAt", "DESC"]], // optional: latest first
            });

            if (!templates || templates.length === 0) {
                return socket.emit("fetch-basic-sgha-error", {
                    message: sgha_template_id
                        ? `No SGHA Template found with ID ${sgha_template_id}.`
                        : "No SGHA Templates found.",
                });
            }

            // ✅ Emit success event with full list
            socket.emit("fetch-basic-sgha-success", templates);
        } catch (err) {
            console.error("❌ Failed to fetch basic SGHA data:", err);
            socket.emit("fetch-basic-sgha-error", {
                message: "Failed to fetch basic SGHA data",
                error: err.message,
            });
        }
    });





};
