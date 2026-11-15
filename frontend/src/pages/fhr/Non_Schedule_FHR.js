import React from "react";
import { useNavigate } from "react-router-dom";
import { EmployeePageHeader } from "../../components/EmployeePageChrome";
import { EMPLOYEE_ROUTES } from "../../utils/employeeWorkspace";
import CreateNonScheduleFhr from "../../components/form_FHR/CreateNonScheduleFhr";

const Non_Schedule_FHR = () => {
  const navigate = useNavigate();

  return (
    <div className="employee-page fhr-nonschedule-page">
      <EmployeePageHeader
        title="Create Non-Schedule FHR"
        backTo={EMPLOYEE_ROUTES.fhrDraft}
        backLabel="Draft FHRs"
        items={[{ label: "Non-Schedule" }]}
      />
      <p className="text-muted mb-3">
        Create a draft flight handling report for a non-scheduled movement. You can
        complete arrival, departure, and equipment details after it is created.
      </p>
      <CreateNonScheduleFhr
        onCancel={() => navigate(EMPLOYEE_ROUTES.fhrDraft)}
        onCreated={({ fhr_id }) => {
          if (fhr_id) {
            navigate(`/dashboard/edit_fhr/${fhr_id}`);
            return;
          }
          navigate(EMPLOYEE_ROUTES.fhrDraft);
        }}
      />
    </div>
  );
};

export default Non_Schedule_FHR;
