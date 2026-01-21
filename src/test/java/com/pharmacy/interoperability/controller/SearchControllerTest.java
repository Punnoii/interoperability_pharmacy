package com.pharmacy.interoperability.controller;

import com.pharmacy.Application; // ✅ ต้อง Import ตัวนี้จาก package หลัก
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

// Static Imports สำหรับการ Test
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// ✅ ระบุ classes = Application.class เพื่อให้ Test รู้ว่า Main Class อยู่ไหน
@SpringBootTest(classes = Application.class)
@AutoConfigureMockMvc
public class SearchControllerTest {

    @Autowired
    private MockMvc mvc;

    @Test
    public void searchShouldReturnResultsFromBothDbs() throws Exception {
        // ยิง Request ไปที่ /search?term=paracetamol
        MvcResult result = mvc.perform(get("/search?term=paracetamol")
                .contentType(MediaType.APPLICATION_JSON))
                
                // 1. ปริ้น Log ออกมาดู (ถ้า Error ให้ดูตรงนี้ว่า Body ว่างไหม)
                .andDo(print()) 

                // 2. เช็ค Status 200 OK
                .andExpect(status().isOk())
                
                // 3. เช็คว่าเป็น Array และมีข้อมูล
                .andExpect(jsonPath("$").isArray())
                
                // เช็คว่ามีข้อมูลจากทั้ง db1 และ db2
                // หมายเหตุ: ถ้า Test ตกตรงนี้ แปลว่า DB ไม่ได้ถูก Init ตอนเริ่ม Test
                .andExpect(jsonPath("$[?(@.source == 'db1')]").exists()) 
                .andExpect(jsonPath("$[?(@.source == 'db2')]").exists())

                .andReturn();

        String responseBody = result.getResponse().getContentAsString();

        System.out.println("---------- CHECK DATA MANUALLY ----------");
        System.out.println("Data: " + responseBody);

        assertFalse(responseBody.isEmpty(), "❌ Response body ว่างเปล่า (แสดงว่าค้นหาไม่เจอ)");
    }

    @Test
    public void searchShouldNormalizeData() throws Exception {
        // ทดสอบการแปลงหน่วย (0.500 g -> 500.0 mg)
        mvc.perform(get("/search?term=Tylenol")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                // เช็คว่ามี db2 ที่แปลงเป็น 500.0 แล้ว
                .andExpect(jsonPath("$[?(@.source == 'db2' && @.strengthMg == 500.0)]").exists());
    }
}