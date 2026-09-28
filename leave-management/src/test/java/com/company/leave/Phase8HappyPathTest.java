package com.company.leave;

import com.company.leave.web.dto.ApplyLeaveRequest;
import com.company.leave.web.dto.LoginRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Phase 8: Full happy-path integration test.
 *
 * 1. alice submits leave → PENDING_MANAGER
 * 2. manager approves   → PENDING_HR
 * 3. HR approves        → APPROVED
 * 4. alice cancels      → CANCELLED (if not started)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class Phase8HappyPathTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper mapper;

    private String aliceToken;
    private String managerToken;
    private String hrToken;

    @BeforeEach
    void setup() throws Exception {
        aliceToken   = loginToken("alice@demo.com");
        managerToken = loginToken("manager@demo.com");
        hrToken      = loginToken("hr@demo.com");
    }

    @Test
    void fullApprovalWorkflow() throws Exception {
        // 1. alice submits a leave for 2 weeks ahead
        LocalDate start = LocalDate.now().plusDays(30);
        LocalDate end   = start.plusDays(2);
        var req = new ApplyLeaveRequest(leaveTypeId(), start, end, "Holiday");

        MvcResult submitResult = mockMvc.perform(post("/api/leaves")
                .header("Authorization", "Bearer " + aliceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_MANAGER"))
                .andReturn();

        long leaveId = mapper.readTree(submitResult.getResponse().getContentAsString())
                .get("id").asLong();

        // 2. manager approves
        mockMvc.perform(post("/api/manager/approvals/" + leaveId + "/approve")
                .header("Authorization", "Bearer " + managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_HR"));

        // 3. HR approves
        mockMvc.perform(post("/api/hr/approvals/" + leaveId + "/approve")
                .header("Authorization", "Bearer " + hrToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // 4. alice can view it
        mockMvc.perform(get("/api/leaves/" + leaveId)
                .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // 5. alice cancels (start is in future)
        mockMvc.perform(delete("/api/leaves/" + leaveId)
                .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void wrongRoleCannotAccessManagerEndpoint() throws Exception {
        mockMvc.perform(get("/api/manager/approvals")
                .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedCannotAccessLeaves() throws Exception {
        mockMvc.perform(get("/api/leaves"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void previewEndpointWorks() throws Exception {
        LocalDate start = LocalDate.now().plusDays(30);
        mockMvc.perform(post("/api/leaves/preview")
                .header("Authorization", "Bearer " + aliceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"leaveTypeId":%d,"startDate":"%s","endDate":"%s"}
                    """.formatted(leaveTypeId(), start, start.plusDays(2)).trim()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.feasibilityPercent").exists())
                .andExpect(jsonPath("$.workingDays").isNumber());
    }

    @Test
    void balanceEndpointReturnsData() throws Exception {
        mockMvc.perform(get("/api/balances/my")
                .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").exists());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private String loginToken(String email) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(new LoginRequest(email, "Demo@123"))))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(r.getResponse().getContentAsString()).get("token").asText();
    }

    private long leaveTypeId() throws Exception {
        // ANNUAL leave type ID — query via balance endpoint
        MvcResult r = mockMvc.perform(get("/api/balances/my")
                .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andReturn();
        var balances = mapper.readTree(r.getResponse().getContentAsString());
        for (var b : balances) {
            if ("ANNUAL".equals(b.get("code").asText())) {
                return b.get("leaveTypeId").asLong();
            }
        }
        throw new RuntimeException("ANNUAL leave type not found");
    }
}
