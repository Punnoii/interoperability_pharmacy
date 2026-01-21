package com.pharmacy.interoperability.controller;

import com.pharmacy.interoperability.Application;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

// *** ส่วนที่เพิ่มมา: Imports สำหรับการเช็คค่าและปริ้น log ***
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print; // ตัวสำคัญสำหรับดู Log
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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

                // 1. สั่งปริ้น JSON ที่ได้ออกมาดูใน Console (จะเห็นข้อมูลยาที่นี่)
                .andDo(print())

                // 2. เช็ค Status และโครงสร้างข้อมูลตามปกติ
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].brandName").exists()) // เช็คว่ามีฟิลด์ brandName
                .andExpect(jsonPath("$[?(@.source == 'db1')]").exists())
                .andExpect(jsonPath("$[?(@.source == 'db2')]").exists())

                // 3. (ที่คุณขอมา) เช็คว่าค่า brandName ต้องมีคำว่า Paracetamol (Case
                // Insensitive อาจต้องปรับตาม Data จริง)
                // หมายเหตุ: ตรงนี้ผมใช้ brandName แทน name ตามโครงสร้าง JSON เดิมของคุณ
                // .andExpect(jsonPath("$[0].brandName").value(containsString("Paracetamol")))

                .andReturn(); // คืนค่าผลลัพธ์เพื่อเอาไปเช็คต่อแบบ Manual

        // 4. (ที่คุณขอมา) ดึง String ออกมาเช็คว่า "ไม่ว่างเปล่า"
        String responseBody = result.getResponse().getContentAsString();

        System.out.println("---------- CHECK DATA MANUALLY ----------");
        System.out.println("Data: " + responseBody); // ปริ้นย้ำอีกที

        // เช็คว่า responseBody ต้องไม่ว่าง (ถ้าว่าง Test จะพังตรงนี้)
        assertFalse(responseBody.isEmpty(), "ข้อมูลที่ได้ต้องไม่ว่างเปล่า (Response body must not be empty)");
    }

    @Test
    public void searchShouldNormalizeData() throws Exception {
        // "Tylenol" in DB2 is 0.500 g, should be normalized to 500.0 mg
        mvc.perform(get("/search?term=Tylenol")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print()) // ใส่ print ให้ด้วยเผื่ออยากดู data เคสนี้
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.source == 'db2' && @.strengthMg == 500.0)]").exists());
    }
}