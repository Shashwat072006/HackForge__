package com.company.leave;

import com.company.leave.web.dto.LoginRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class Phase1AuthTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper mapper;

    @Test void employeeCanLogin() throws Exception { login("alice@demo.com"); }
    @Test void managerCanLogin()  throws Exception { login("manager@demo.com"); }
    @Test void hrCanLogin()       throws Exception { login("hr@demo.com"); }
    @Test void adminCanLogin()    throws Exception { login("admin@demo.com"); }

    @Test void wrongPasswordReturns401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(new LoginRequest("alice@demo.com", "WRONG"))))
                .andExpect(status().isUnauthorized());
    }

    private void login(String email) throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(new LoginRequest(email, "Demo@123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email));
    }
}
