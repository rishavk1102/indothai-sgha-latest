import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Card, Col, Form, Row, Table } from "react-bootstrap";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import api from "../../api/axios";
import GifLoder from "../../interfaces/GifLoder";
import {
  EmployeePageHeader,
  EmployeeRelatedLinks,
  EMPLOYEE_ROUTES,
  PAGE_PERMISSION_NAMES,
} from "../../components/EmployeePageChrome";
import { downloadInvoicePdf } from "../../utils/invoicePdf";

const PAGE_NAME = PAGE_PERMISSION_NAMES.billing;
const encodedPage = encodeURIComponent(PAGE_NAME);

const money = (value, currency = "INR") => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)}`;
  }
};

/** Free typing: "1", "1.", "10.5". Reject extra decimals / junk. */
const PAID_AMOUNT_RE = /^\d*\.?\d{0,2}$/;

const paidAmountNumber = (raw) => {
  const v = String(raw ?? "").trim();
  if (!v || v === ".") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const paidAmountIssue = (raw, max, currency) => {
  const n = paidAmountNumber(raw);
  if (n == null) return "Enter the amount that was paid.";
  if (!(n > 0)) return "Amount must be greater than 0.";
  if (max > 0 && n > max + 0.009) {
    return `Cannot exceed ${money(max, currency)}`;
  }
  return "";
};

const lineNeedsPrice = (line) =>
  String(line?.line_type || "") === "Additional" &&
  !(Number(line?.unit_rate) > 0);

const statusBadge = (status) => {
  switch (status) {
    case "Issued":
      return "success";
    case "Under review":
      return "info";
    case "Credit note":
      return "warning";
    case "Voided":
      return "danger";
    default:
      return "secondary";
  }
};

const Billing = () => {
  const navigate = useNavigate();
  const { invoice_id: invoiceIdParam } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState({});
  const [detail, setDetail] = useState(null);
  const [tariffLines, setTariffLines] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [pickedLineId, setPickedLineId] = useState(null);
  const [pickedQty, setPickedQty] = useState(1);
  const [editLine, setEditLine] = useState(null);
  const [editQty, setEditQty] = useState(1);
  const [editRate, setEditRate] = useState(0);
  const [voidOpen, setVoidOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditMode, setCreditMode] = useState(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditLineIds, setCreditLineIds] = useState([]);

  const relatedLinks = [
    { label: "SGHA Tariffs", to: EMPLOYEE_ROUTES.sghaTariffs },
    { label: "Additional charges", to: EMPLOYEE_ROUTES.additionalCharges },
    { label: "Services price", to: EMPLOYEE_ROUTES.servicesPrice },
  ];

  const isDraft = detail?.status === "Draft";
  const isUnderReview = detail?.status === "Under review";
  const isIssued = detail?.status === "Issued";

  const loadLists = async () => {
    setLoading(true);
    setError("");
    try {
      const [queueRes, invRes] = await Promise.all([
        api.get(`/billing/queue/${encodedPage}`),
        api.get(`/billing/invoices/${encodedPage}`),
      ]);
      setQueue(Array.isArray(queueRes.data?.fhrs) ? queueRes.data.fhrs : []);
      setInvoices(
        Array.isArray(invRes.data?.invoices) ? invRes.data.invoices : []
      );
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (invoiceId) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/billing/invoices/${encodedPage}/${invoiceId}`
      );
      setDetail(res.data?.invoice || null);
    } catch (err) {
      setDetail(null);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceIdParam) return undefined;
    loadLists();
    return undefined;
  }, [invoiceIdParam]);

  useEffect(() => {
    if (!invoiceIdParam) {
      setDetail(null);
      setTariffLines([]);
      return undefined;
    }
    loadDetail(invoiceIdParam);
    return undefined;
  }, [invoiceIdParam]);

  useEffect(() => {
    if (!detail?.invoice_id || detail.status !== "Draft") {
      setTariffLines([]);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get(
          `/billing/invoices/${encodedPage}/${detail.invoice_id}/tariff-lines`
        );
        if (!cancelled) {
          setTariffLines(Array.isArray(res.data?.lines) ? res.data.lines : []);
        }
      } catch {
        if (!cancelled) setTariffLines([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [detail?.invoice_id, detail?.status]);

  const toggle = (fhrId) => {
    setSelected((prev) => ({ ...prev, [fhrId]: !prev[fhrId] }));
  };

  const selectedIds = Object.keys(selected)
    .filter((id) => selected[id])
    .map(Number);

  const createInvoice = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    try {
      const res = await api.post(`/billing/invoices/${encodedPage}`, {
        fhr_ids: selectedIds,
      });
      setSelected({});
      navigate(`${EMPLOYEE_ROUTES.billing}/${res.data.invoice.invoice_id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  const approve = async () => {
    if (!detail?.invoice_id) return;
    const unpriced = (detail.lines || []).filter(lineNeedsPrice);
    if (unpriced.length) {
      setError(
        `Set a unit rate on unpriced ad-hoc line(s) before approving: ${unpriced
          .map((line) => line.description || "Ad-hoc service")
          .join(", ")}`
      );
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(
        `/billing/invoices/${encodedPage}/${detail.invoice_id}/approve`
      );
      setDetail(res.data.invoice);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const returnToDraft = async () => {
    if (!detail?.invoice_id) return;
    setLoading(true);
    try {
      const res = await api.post(
        `/billing/invoices/${encodedPage}/${detail.invoice_id}/return-to-draft`
      );
      setDetail(res.data.invoice);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const issue = async () => {
    if (!detail?.invoice_id) return;
    setLoading(true);
    try {
      const res = await api.post(
        `/billing/invoices/${encodedPage}/${detail.invoice_id}/issue`
      );
      setDetail(res.data.invoice);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const voidInvoice = async () => {
    if (!detail?.invoice_id) return;
    setLoading(true);
    try {
      const res = await api.post(
        `/billing/invoices/${encodedPage}/${detail.invoice_id}/void`
      );
      setDetail(res.data.invoice);
      setVoidOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCreditNote = async () => {
    if (!detail?.invoice_id || !creditMode) return;
    if (creditMode === "partial") {
      const issue = paidAmountIssue(
        creditAmount,
        Number(detail?.grand_total) || 0,
        detail?.currency
      );
      if (issue) {
        setError(issue);
        return;
      }
    }
    if (creditMode === "lines" && !creditLineIds.length) {
      setError("Select at least one line that was paid.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(
        `/billing/invoices/${encodedPage}/${detail.invoice_id}/credit-note`,
        {
          mode: creditMode,
          amount:
            creditMode === "partial" ? paidAmountNumber(creditAmount) : undefined,
          line_ids: creditMode === "lines" ? creditLineIds : undefined,
        }
      );
      setCreditOpen(false);
      navigate(`${EMPLOYEE_ROUTES.billing}/${res.data.invoice.invoice_id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  const openCreditDialog = () => {
    setCreditMode(null);
    setCreditAmount("");
    setCreditLineIds([]);
    setError("");
    setCreditOpen(true);
  };

  const creditPreview = () => {
    if (creditMode === "full") return Number(detail?.grand_total) || 0;
    if (creditMode === "partial") return paidAmountNumber(creditAmount) || 0;
    if (creditMode === "lines") {
      return (detail?.lines || [])
        .filter((line) => creditLineIds.includes(line.invoice_line_id))
        .reduce(
          (sum, line) =>
            sum + Number(line.amount || 0) + Number(line.tax || 0),
          0
        );
    }
    return 0;
  };

  const creditReady =
    creditMode === "full"
      ? Boolean(detail?.lines?.length)
      : creditMode === "partial"
        ? !paidAmountIssue(
            creditAmount,
            Number(detail?.grand_total) || 0,
            detail?.currency
          )
        : creditMode === "lines"
          ? creditLineIds.length > 0
          : false;

  const toggleCreditLine = (lineId) => {
    setCreditLineIds((prev) =>
      prev.includes(lineId)
        ? prev.filter((id) => id !== lineId)
        : [...prev, lineId]
    );
  };

  const removeLine = async (lineId) => {
    if (!detail?.invoice_id) return;
    setLoading(true);
    try {
      const res = await api.delete(
        `/billing/invoices/${encodedPage}/${detail.invoice_id}/lines/${lineId}`
      );
      setDetail(res.data.invoice);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveEditLine = async () => {
    if (!detail?.invoice_id || !editLine) return;
    setLoading(true);
    try {
      const res = await api.put(
        `/billing/invoices/${encodedPage}/${detail.invoice_id}/lines/${editLine.invoice_line_id}`,
        {
          qty: Number(editQty) || 1,
          unit_rate: Number(editRate) || 0,
        }
      );
      setDetail(res.data.invoice);
      setEditLine(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const addFromTariff = async () => {
    if (!detail?.invoice_id || !pickedLineId) return;
    setLoading(true);
    try {
      const res = await api.post(
        `/billing/invoices/${encodedPage}/${detail.invoice_id}/lines`,
        { tariff_line_id: pickedLineId, qty: pickedQty }
      );
      setDetail(res.data.invoice);
      setAddOpen(false);
      setPickedLineId(null);
      setPickedQty(1);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !queue.length && !detail && !invoices.length) {
    return (
      <div className="loderDiv">
        <GifLoder />
      </div>
    );
  }

  if (invoiceIdParam && detail) {
    const tariffOptions = tariffLines.map((line) => ({
      label: `${line.line_type}: ${line.description || "Service"} — ${money(
        line.rate,
        detail.currency
      )}`,
      value: line.tariff_line_id,
    }));

    const unpricedAdhoc = (detail.lines || []).filter(lineNeedsPrice);

    return (
      <>
        <EmployeePageHeader
          title={detail.invoice_no}
          backTo={EMPLOYEE_ROUTES.billing}
          backLabel="Billing"
          items={[{ label: detail.invoice_no }]}
          extra={
            <>
              <Badge
                bg={statusBadge(detail.status)}
                className={`align-self-center${
                  detail.status === "Voided" ? " text-white" : ""
                }`}
              >
                {detail.status}
              </Badge>
              {isDraft ? (
                <Button
                  label="Approve for review"
                  onClick={approve}
                  disabled={unpricedAdhoc.length > 0}
                />
              ) : null}
              {isUnderReview ? (
                <>
                  <Button
                    label="Return to draft"
                    className="p-button-outlined"
                    onClick={returnToDraft}
                  />
                  <Button label="Issue invoice" onClick={issue} />
                </>
              ) : null}
              {isIssued ? (
                <>
                  <Button
                    label="Credit note"
                    className="p-button-outlined p-button-warning"
                    onClick={openCreditDialog}
                  />
                  <Button
                    label="Void"
                    severity="danger"
                    onClick={() => setVoidOpen(true)}
                  />
                </>
              ) : null}
              <Button
                label="Download PDF"
                icon="pi pi-file-pdf"
                className="p-button-outlined"
                onClick={async () => {
                  try {
                    const res = await api.get(
                      `/billing/invoices/${encodedPage}/${detail.invoice_id}`
                    );
                    downloadInvoicePdf(res.data?.invoice || detail);
                  } catch {
                    downloadInvoicePdf(detail);
                  }
                }}
              />
            </>
          }
        />
        <EmployeeRelatedLinks links={relatedLinks} />

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <Card className="mb-3 border-0 shadow-sm">
          <Card.Body>
            <Row className="g-3 small">
              <Col sm={6} md={4}>
                <div className="text-muted">Client</div>
                <div className="fw-semibold">
                  {detail.client?.name || detail.bill_to?.name || "—"}
                </div>
              </Col>
              <Col sm={6} md={4}>
                <div className="text-muted">Airport</div>
                <div className="fw-semibold">
                  {detail.airport?.iata || detail.bill_from?.iata || "—"}
                </div>
              </Col>
              <Col sm={6} md={4}>
                <div className="text-muted">Total</div>
                <div className="fw-semibold">
                  {money(detail.grand_total, detail.currency)}
                </div>
              </Col>
              {detail.credits_invoice_id ? (
                <Col sm={12}>
                  <div className="text-muted small">
                    Credits invoice #{detail.credits_invoice_id}
                    <Button
                      label="Open original"
                      className="p-button-text p-button-sm ms-2 p-0"
                      onClick={() =>
                        navigate(
                          `${EMPLOYEE_ROUTES.billing}/${detail.credits_invoice_id}`
                        )
                      }
                    />
                  </div>
                </Col>
              ) : null}
            </Row>
          </Card.Body>
        </Card>

        <div className="pricing-section-card">
          <div className="pricing-section-card__head">
            <h6>
              {isDraft ? "Draft lines" : "Invoice lines"} (
              {detail.lines?.length || 0})
            </h6>
            {isDraft ? (
              <Button
                label="Add from tariff"
                icon="pi pi-plus"
                className="p-button-sm"
                onClick={() => {
                  setPickedLineId(null);
                  setPickedQty(1);
                  setAddOpen(true);
                }}
              />
            ) : null}
          </div>
          <div className="pricing-section-card__body">
            {isDraft && unpricedAdhoc.length ? (
              <div className="alert alert-warning py-2 px-3 mb-3">
                Ad-hoc FHR services have no rate yet. Edit each line and set the
                unit rate before approving.
              </div>
            ) : null}
            <div className="table-responsive">
              <Table striped hover className="align-middle mb-0 pricing-data-table">
                <thead>
                  <tr>
                    <th className="col-num">FHR</th>
                    <th>Description</th>
                    <th className="col-code">Type</th>
                    <th className="col-money text-end">Qty</th>
                    <th className="col-money text-end">Rate</th>
                    <th className="col-money text-end">Amount</th>
                    {isDraft ? <th className="col-actions" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {(detail.lines || []).map((line) => (
                    <tr key={line.invoice_line_id}>
                      <td className="col-num">
                        {line.fhr_id ? `#${line.fhr_id}` : "—"}
                      </td>
                      <td>{line.description}</td>
                      <td className="col-code">{line.line_type}</td>
                      <td className="col-money text-end">{line.qty}</td>
                      <td className="col-money text-end">
                        {lineNeedsPrice(line)
                          ? "—"
                          : money(line.unit_rate, detail.currency)}
                      </td>
                      <td className="col-money text-end">
                        {lineNeedsPrice(line)
                          ? "Set rate"
                          : money(line.amount, detail.currency)}
                      </td>
                      {isDraft ? (
                        <td className="col-actions text-end">
                          <Button
                            icon="pi pi-pencil"
                            className="p-button-text p-button-sm"
                            onClick={() => {
                              setEditLine(line);
                              setEditQty(Number(line.qty) || 1);
                              setEditRate(Number(line.unit_rate) || 0);
                            }}
                            aria-label="Edit line"
                          />
                          <Button
                            icon="pi pi-trash"
                            className="p-button-text p-button-danger p-button-sm"
                            onClick={() => removeLine(line.invoice_line_id)}
                            aria-label="Remove line"
                          />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {!(detail.lines || []).length && (
                    <tr>
                      <td
                        colSpan={isDraft ? 7 : 6}
                        className="text-center text-muted py-4"
                      >
                        No lines on this invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </div>

        <Dialog
          header="Create credit note"
          visible={creditOpen}
          style={{ width: "36rem" }}
          className="credit-note-dialog"
          modal
          closable={!loading}
          onHide={() => {
            if (!loading) setCreditOpen(false);
          }}
          footer={
            <div className="d-flex justify-content-end gap-2">
              <Button
                label="Cancel"
                className="p-button-text"
                disabled={loading}
                onClick={() => setCreditOpen(false)}
              />
              <Button
                label="Create credit note"
                severity="warning"
                loading={loading}
                disabled={!creditReady}
                onClick={createCreditNote}
              />
            </div>
          }
        >
          <p className="mb-2">
            How much of <strong>{detail.invoice_no}</strong> was paid? The
            Issued invoice stays as-is; this credit note covers only what you
            choose.
          </p>
          <Form.Check
            type="radio"
            name="credit-mode"
            id="credit-mode-full"
            className="mb-2"
            label={`Full payment · ${money(
              detail.grand_total,
              detail.currency
            )}`}
            checked={creditMode === "full"}
            onChange={() => setCreditMode("full")}
          />
          <Form.Check
            type="radio"
            name="credit-mode"
            id="credit-mode-partial"
            className="mb-2"
            label="Partial payment · enter the amount received"
            checked={creditMode === "partial"}
            onChange={() => setCreditMode("partial")}
          />
          <Form.Check
            type="radio"
            name="credit-mode"
            id="credit-mode-lines"
            className="mb-3"
            label="Specific line items · only the services that were paid"
            checked={creditMode === "lines"}
            onChange={() => setCreditMode("lines")}
          />

          {creditMode === "partial" ? (
            <Form.Group className="mb-3">
              <Form.Label>Amount paid</Form.Label>
              <Form.Control
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="e.g. 1500 or 1500.50"
                value={creditAmount}
                isInvalid={Boolean(
                  creditAmount &&
                    paidAmountIssue(
                      creditAmount,
                      Number(detail.grand_total) || 0,
                      detail.currency
                    )
                )}
                onChange={(e) => {
                  const next = e.target.value.replace(/,/g, "");
                  if (next === "" || PAID_AMOUNT_RE.test(next)) {
                    setCreditAmount(next);
                    setError("");
                  }
                }}
              />
              <Form.Control.Feedback type="invalid">
                {paidAmountIssue(
                  creditAmount,
                  Number(detail.grand_total) || 0,
                  detail.currency
                )}
              </Form.Control.Feedback>
            </Form.Group>
          ) : null}

          {creditMode === "lines" ? (
            <>
              <div className="d-flex gap-2 mb-2">
                <Button
                  label="Select all"
                  className="p-button-text p-button-sm"
                  onClick={() =>
                    setCreditLineIds(
                      (detail.lines || []).map((line) => line.invoice_line_id)
                    )
                  }
                />
                <Button
                  label="Clear"
                  className="p-button-text p-button-sm"
                  onClick={() => setCreditLineIds([])}
                />
              </div>
              <div className="credit-note-lines border rounded p-2 mb-2">
                {(detail.lines || []).map((line) => (
                  <Form.Check
                    key={line.invoice_line_id}
                    type="checkbox"
                    className="mb-2"
                    id={`credit-line-${line.invoice_line_id}`}
                    checked={creditLineIds.includes(line.invoice_line_id)}
                    onChange={() => toggleCreditLine(line.invoice_line_id)}
                    label={`${line.description || "Line"} · ${money(
                      line.amount,
                      detail.currency
                    )}`}
                  />
                ))}
                {!detail.lines?.length ? (
                  <p className="text-muted small mb-0">
                    No lines on this invoice.
                  </p>
                ) : null}
              </div>
              {(detail.lines || []).length > 5 ? (
                <p className="text-muted small mb-2">
                  {(detail.lines || []).length} lines — scroll the list to see
                  all. Select all still includes hidden ones.
                </p>
              ) : null}
            </>
          ) : null}

          {creditMode ? (
            <p className="mb-2 fw-semibold">
              Credit {money(creditPreview(), detail.currency)}
            </p>
          ) : null}
          <p className="mb-0 text-muted small">
            Use Void only when you need a full replacement invoice for the same
            FHRs.
          </p>
        </Dialog>

        <Dialog
          header="Void invoice"
          visible={voidOpen}
          style={{ width: "28rem" }}
          modal
          closable={!loading}
          onHide={() => {
            if (!loading) setVoidOpen(false);
          }}
          footer={
            <div className="d-flex justify-content-end gap-2">
              <Button
                label="Cancel"
                className="p-button-text"
                disabled={loading}
                onClick={() => setVoidOpen(false)}
              />
              <Button
                label="Void invoice"
                severity="danger"
                loading={loading}
                onClick={voidInvoice}
              />
            </div>
          }
        >
          <p className="mb-2">
            Void <strong>{detail.invoice_no}</strong>? Linked FHRs become
            available for a replacement draft invoice.
          </p>
          <p className="mb-0 text-muted small">
            Prefer a credit note if you only need to reverse charges.
          </p>
        </Dialog>

        <Dialog
          header="Add line from tariff"
          visible={addOpen}
          style={{ width: "36rem" }}
          modal
          onHide={() => setAddOpen(false)}
          footer={
            <div className="d-flex justify-content-end gap-2">
              <Button
                label="Cancel"
                className="p-button-text"
                onClick={() => setAddOpen(false)}
              />
              <Button
                label="Add"
                disabled={!pickedLineId || loading}
                loading={loading}
                onClick={addFromTariff}
              />
            </div>
          }
        >
          <div className="mb-3">
            <label className="form-label">Tariff line</label>
            {tariffOptions.length ? (
              <Dropdown
                value={pickedLineId}
                options={tariffOptions}
                onChange={(e) => setPickedLineId(e.value)}
                optionLabel="label"
                optionValue="value"
                placeholder="Select priced service"
                className="w-100 billing-tariff-dropdown"
                filter
                filterBy="label"
                showClear
                appendTo={typeof document !== "undefined" ? document.body : null}
                panelClassName="billing-tariff-dropdown-panel"
              />
            ) : (
              <div className="alert alert-warning mb-0 py-2 small">
                No Active tariff lines available for this invoice airport. Refresh
                walk-up / complete an SGHA tariff, then reopen this dialog.
              </div>
            )}
          </div>
          <div className="mb-0">
            <label className="form-label">Qty</label>
            <InputNumber
              value={pickedQty}
              onValueChange={(e) => setPickedQty(e.value || 1)}
              min={0.01}
              maxFractionDigits={2}
              className="w-100"
              inputClassName="w-100"
            />
          </div>
        </Dialog>

        <Dialog
          header="Edit line"
          visible={Boolean(editLine)}
          style={{ width: "28rem" }}
          modal
          onHide={() => setEditLine(null)}
          footer={
            <div className="d-flex justify-content-end gap-2">
              <Button
                label="Cancel"
                className="p-button-text"
                onClick={() => setEditLine(null)}
              />
              <Button
                label="Save"
                loading={loading}
                onClick={saveEditLine}
              />
            </div>
          }
        >
          <div className="mb-2 small text-muted">{editLine?.description}</div>
          <div className="mb-3">
            <label className="form-label">Qty</label>
            <InputNumber
              value={editQty}
              onValueChange={(e) => setEditQty(e.value || 1)}
              min={0.01}
              maxFractionDigits={2}
              className="w-100"
              inputClassName="w-100"
            />
          </div>
          <div className="mb-0">
            <label className="form-label">Unit rate</label>
            <InputNumber
              value={editRate}
              onValueChange={(e) => setEditRate(e.value ?? 0)}
              min={0}
              maxFractionDigits={2}
              className="w-100"
              inputClassName="w-100"
              mode="decimal"
              useGrouping={false}
            />
            {lineNeedsPrice(editLine) ? (
              <div className="text-muted small mt-1">
                This ad-hoc service was unpriced on the FHR. Enter the rate
                here.
              </div>
            ) : null}
          </div>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <EmployeePageHeader
        title="Billing"
        items={[{ label: "Billing" }]}
        backLabel="Home"
      />
      <EmployeeRelatedLinks links={relatedLinks} />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="pricing-section-card">
        <div className="pricing-section-card__head">
          <h6>Ready to invoice</h6>
          <Button
            label={`Create draft (${selectedIds.length})`}
            icon="pi pi-file"
            className="p-button-sm"
            disabled={!selectedIds.length || loading}
            onClick={createInvoice}
          />
        </div>
        <div className="pricing-section-card__body">
          <div className="table-responsive">
            <Table striped hover className="align-middle mb-0 pricing-data-table">
              <thead>
                <tr>
                  <th className="col-check" />
                  <th className="col-num">FHR</th>
                  <th>Client</th>
                  <th className="col-code">Airport</th>
                  <th>Aircraft</th>
                  <th className="col-code">Date</th>
                  <th className="col-money text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((row) => (
                  <tr key={row.fhr_id}>
                    <td className="col-check">
                      <Form.Check
                        checked={Boolean(selected[row.fhr_id])}
                        onChange={() => toggle(row.fhr_id)}
                        aria-label={`Select FHR ${row.fhr_id}`}
                      />
                    </td>
                    <td className="col-num">#{row.fhr_id}</td>
                    <td>{row.client?.name || row.client_id}</td>
                    <td className="col-code">{row.airport?.iata || "—"}</td>
                    <td>{row.aircraft?.type_name || "—"}</td>
                    <td className="col-code">{row.rating_date || "—"}</td>
                    <td className="col-money text-end">
                      {money(row.total, row.currency)}
                    </td>
                  </tr>
                ))}
                {!queue.length && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No rated FHRs waiting for invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      <div className="pricing-section-card">
        <div className="pricing-section-card__head">
          <h6>Invoices</h6>
        </div>
        <div className="pricing-section-card__body">
          <div className="table-responsive">
            <Table
              striped
              hover
              className="align-middle mb-0 pricing-data-table pricing-data-table--invoices"
            >
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Client</th>
                  <th className="col-status">Status</th>
                  <th className="col-money text-end">Total</th>
                  <th className="col-actions" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((row) => (
                  <tr key={row.invoice_id}>
                    <td className="col-code">{row.invoice_no}</td>
                    <td>{row.client?.name || row.bill_to?.name || "—"}</td>
                    <td className="col-status">
                      <Badge
                        bg={statusBadge(row.status)}
                        className={
                          row.status === "Voided" ? "text-white" : undefined
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="col-money text-end">
                      {money(row.grand_total, row.currency)}
                    </td>
                    <td className="col-actions text-end">
                      <Button
                        label="View"
                        className="p-button-sm p-button-outlined"
                        onClick={() =>
                          navigate(
                            `${EMPLOYEE_ROUTES.billing}/${row.invoice_id}`
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
                {!invoices.length && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      No invoices yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
};

export default Billing;
