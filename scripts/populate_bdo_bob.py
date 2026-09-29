import os
import sys
import json
import win32com.client

def populate_bdo_bob_excel(template_path, output_path, upload_date, company_code, batch, rows):
    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False

    try:
        wb = excel.Workbooks.Open(os.path.abspath(template_path))
        ws = wb.Sheets("Sheet1")

        # 1. Set Metadata Cells
        if upload_date:
            ws.Range("B2").Value = str(upload_date)
        if company_code:
            ws.Range("B3").Value = str(company_code)
        if batch:
            ws.Range("B5").Value = str(batch)

        # 2. Clear existing employee data rows (A7:D500)
        ws.Range("A7:D500").ClearContents()

        # 3. Populate employee rows starting at row 7
        for idx, row in enumerate(rows):
            r = 7 + idx
            ws.Range(f"A{r}").Value = str(row.get("account", ""))
            ws.Range(f"B{r}").Value = float(row.get("amount", 0))
            ws.Range(f"C{r}").Value = str(row.get("name", "")).upper()
            ws.Range(f"D{r}").Value = str(row.get("remarks", ""))

        wb.SaveAs(os.path.abspath(output_path))
        wb.Close(False)
        print("SUCCESS")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        excel.Quit()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if os.path.exists(arg):
            with open(arg, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = json.loads(arg)

        populate_bdo_bob_excel(
            data["templatePath"],
            data["outputPath"],
            data["uploadDate"],
            data["companyCode"],
            data["batch"],
            data["rows"]
        )
    else:
        print("No input payload argument provided")
        sys.exit(1)
