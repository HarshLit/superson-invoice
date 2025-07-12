class InvoiceGenerator {
    constructor() {
        this.itemCount = 0;
        this.invoices = this.loadInvoicesFromStorage();
        this.initEventListeners();
        this.addItem(); // Add first item row
        this.displaySavedInvoices();
        this.setDefaultDate();
    }

    initEventListeners() {
        document.getElementById('addItem').addEventListener('click', () => this.addItem());
        document.getElementById('saveInvoice').addEventListener('click', () => this.saveInvoice());
        document.getElementById('generatePDF').addEventListener('click', () => this.generatePDF());
        document.getElementById('loadInvoice').addEventListener('click', () => this.loadInvoice());
        document.getElementById('clearForm').addEventListener('click', () => this.clearForm());
        document.getElementById('advance').addEventListener('input', () => this.calculateTotal());
        document.getElementById('addOldDue').addEventListener('change', () => this.toggleOldDueFields());
        document.getElementById('oldDueAmount').addEventListener('input', () => this.calculateTotal());
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('invoiceDate').value = today;
    }

    toggleOldDueFields() {
        const checkbox = document.getElementById('addOldDue');
        const fields = document.getElementById('oldDueFields');
        fields.style.display = checkbox.checked ? 'block' : 'none';
        
        if (!checkbox.checked) {
            // Clear old due fields when unchecked
            document.getElementById('oldBillNumber').value = '';
            document.getElementById('oldBillDate').value = '';
            document.getElementById('oldDueAmount').value = '';
            this.calculateTotal();
        }
    }

    addItem() {
        this.itemCount++;
        const tableBody = document.getElementById('itemsTableBody');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${this.itemCount}</td>
            <td><textarea class="item-description" placeholder="Description (Shift+Enter for line break)" required rows="1"></textarea></td>
            <td><input type="text" class="item-size" placeholder="Size"></td>
            <td><input type="number" class="item-qty" placeholder="Qty" min="1" required></td>
            <td><input type="number" class="item-price" placeholder="Price" step="0.01" min="0" required></td>
            <td class="item-amount">INR 0</td>
            <td><button type="button" class="btn btn-danger remove-item">Remove</button></td>
        `;
        tableBody.appendChild(row);

        // Add event listeners for calculations
        const descriptionTextarea = row.querySelector('.item-description');
        const qtyInput = row.querySelector('.item-qty');
        const priceInput = row.querySelector('.item-price');
        const removeBtn = row.querySelector('.remove-item');

        // Auto-resize textarea and handle line breaks
        descriptionTextarea.addEventListener('input', () => this.autoResizeTextarea(descriptionTextarea));
        descriptionTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent regular Enter from adding line break
                // Move to next field or add new item
                const sizeInput = row.querySelector('.item-size');
                sizeInput.focus();
            }
        });

        qtyInput.addEventListener('input', () => this.calculateItemAmount(row));
        priceInput.addEventListener('input', () => this.calculateItemAmount(row));
        removeBtn.addEventListener('click', () => this.removeItem(row));
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    removeItem(row) {
        row.remove();
        this.renumberItems();
        this.calculateTotal();
    }

    renumberItems() {
        const rows = document.querySelectorAll('#itemsTableBody tr');
        rows.forEach((row, index) => {
            row.querySelector('td').textContent = index + 1;
        });
        this.itemCount = rows.length;
    }

    calculateItemAmount(row) {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const amount = qty * price;
        row.querySelector('.item-amount').textContent = `${amount.toFixed(2)}`;
        this.calculateTotal();
    }

    calculateTotal() {
        const amounts = document.querySelectorAll('.item-amount');
        let subtotal = 0;
        amounts.forEach(amount => {
            const value = parseFloat(amount.textContent.replace('INR ', '')) || 0;
            subtotal += value;
        });
        
        // Add old due amount if present
        const oldDueAmount = parseFloat(document.getElementById('oldDueAmount').value) || 0;
        subtotal += oldDueAmount;
        
        const advance = parseFloat(document.getElementById('advance').value) || 0;
        const total = subtotal - advance;

        document.getElementById('subtotal').value = subtotal.toFixed(2);
        document.getElementById('total').value = total.toFixed(2);
    }

    getFormData() {
        const items = [];
        const rows = document.querySelectorAll('#itemsTableBody tr');
        
        rows.forEach((row, index) => {
            const description = row.querySelector('.item-description').value;
            const size = row.querySelector('.item-size').value;
            const qty = row.querySelector('.item-qty').value;
            const price = row.querySelector('.item-price').value;
            const amount = row.querySelector('.item-amount').textContent.replace('INR ', '');
            
            if (description && qty && price) {
                items.push({
                    srNo: index + 1,
                    description,
                    size,
                    qty: parseInt(qty),
                    price: parseFloat(price),
                    amount: parseFloat(amount)
                });
            }
        });

        return {
            invoiceNumber: document.getElementById('invoiceNumber').value,
            invoiceDate: document.getElementById('invoiceDate').value,
            customerName: document.getElementById('customerName').value,
            customerAddress: document.getElementById('customerAddress').value,
            items: items,
            subtotal: parseFloat(document.getElementById('subtotal').value) || 0,
            advance: parseFloat(document.getElementById('advance').value) || 0,
            total: parseFloat(document.getElementById('total').value) || 0,
            oldDue: {
                hasOldDue: document.getElementById('addOldDue').checked,
                billNumber: document.getElementById('oldBillNumber').value,
                date: document.getElementById('oldBillDate').value,
                amount: parseFloat(document.getElementById('oldDueAmount').value) || 0
            }
        };
    }

    saveInvoice() {
        const data = this.getFormData();
        if (!data.invoiceNumber || !data.customerName || data.items.length === 0) {
            alert('Please fill in all required fields and add at least one item.');
            return;
        }

        const invoiceId = data.invoiceNumber;
        this.invoices[invoiceId] = {
            ...data,
            savedDate: new Date().toISOString()
        };

        this.saveInvoicesToStorage();
        this.displaySavedInvoices();
        alert('Invoice saved successfully!');
    }

    loadInvoice() {
        const invoiceNumber = prompt('Enter invoice number to load:');
        if (!invoiceNumber || !this.invoices[invoiceNumber]) {
            alert('Invoice not found.');
            return;
        }

        const data = this.invoices[invoiceNumber];
        this.populateForm(data);
    }

    populateForm(data) {
        document.getElementById('invoiceNumber').value = data.invoiceNumber;
        document.getElementById('invoiceDate').value = data.invoiceDate;
        document.getElementById('customerName').value = data.customerName;
        document.getElementById('customerAddress').value = data.customerAddress;
        document.getElementById('advance').value = data.advance;

        // Clear existing items
        document.getElementById('itemsTableBody').innerHTML = '';
        this.itemCount = 0;

        // Add items
        data.items.forEach(item => {
            this.addItem();
            const row = document.querySelector('#itemsTableBody tr:last-child');
            const descriptionTextarea = row.querySelector('.item-description');
            descriptionTextarea.value = item.description;
            this.autoResizeTextarea(descriptionTextarea); // Resize after setting value
            row.querySelector('.item-size').value = item.size;
            row.querySelector('.item-qty').value = item.qty;
            row.querySelector('.item-price').value = item.price;
            this.calculateItemAmount(row);
        });
    }

    clearForm() {
        document.getElementById('invoiceForm').reset();
        document.getElementById('itemsTableBody').innerHTML = '';
        this.itemCount = 0;
        this.addItem();
        this.setDefaultDate();
    }

    generatePDF() {
        const data = this.getFormData();
        if (!data.invoiceNumber || !data.customerName || data.items.length === 0) {
            alert('Please fill in all required fields and add at least one item.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Try to set a font that supports ₹ symbol
        try {
            doc.setFont('Arial', 'normal');
        } catch (e) {
            // Fallback to default if Arial is not available
            console.log('Arial font not available, using default');
        }

        // Add page border with slight shadow effect
        doc.setLineWidth(1);
        doc.setDrawColor(100, 100, 100); // Gray border
        doc.rect(10, 10, 190, 277);
        
        // Add subtle inner border for depth
        doc.setLineWidth(0.3);
        doc.setDrawColor(200, 200, 200); // Light gray
        doc.rect(12, 12, 186, 273);

        // Header with center alignment - compressed spacing
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Jai Shree Ganesh', 105, 22, { align: 'center' });
        
        // Company details section without background - moved up
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('SUPER SON ENTERPRISE', 15, 38);
        
        // Add logo image instead of text - with proper async handling
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Enable CORS for canvas operations
        img.onload = () => {
            try {
                // Convert image to base64 using canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/jpeg', 0.9);
                
                // Calculate proper dimensions maintaining aspect ratio
                const originalWidth = img.width;
                const originalHeight = img.height;
                const aspectRatio = originalWidth / originalHeight;
                
                // Set target height and calculate width to maintain aspect ratio
                const targetHeight = 25; // Increased height significantly for better visibility
                const targetWidth = targetHeight * aspectRatio;
                
                // Center the logo image with the company name
                const companyNameWidth = doc.getTextWidth('SUPER SON ENTERPRISE');
                const imageStartX = 15 + (companyNameWidth / 2) - (targetWidth / 2);
                doc.addImage(dataURL, 'JPEG', imageStartX, 42, targetWidth, targetHeight);
                this.completePDFGenerationAsync(doc, data);
            } catch (error) {
                console.error('Error converting image to base64:', error);
                // Fall back to text if image conversion fails
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text('Quality Products at Best Rates', 15, 45);
                this.completePDFGenerationAsync(doc, data);
            }
        };
        img.onerror = () => {
            // If image fails to load, show text as fallback
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Quality Products at Best Rates', 15, 45);
            this.completePDFGenerationAsync(doc, data);
        };
        img.src = 'Our Logo.jpg';
        
        // Return early since PDF generation will complete asynchronously
        return;
    }

    generatePageHeader(doc, data, pageNumber = 1, logoDataURL = null) {
        // Add page border with slight shadow effect
        doc.setLineWidth(1);
        doc.setDrawColor(100, 100, 100); // Gray border
        doc.rect(10, 10, 190, 277);
        
        // Add subtle inner border for depth
        doc.setLineWidth(0.3);
        doc.setDrawColor(200, 200, 200); // Light gray
        doc.rect(12, 12, 186, 273);

        // Header with center alignment - compressed spacing
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Jai Shree Ganesh', 105, 22, { align: 'center' });
        
        // Company details section without background - moved up
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('SUPER SON ENTERPRISE', 15, 38);
        
        // Add logo image if available
        if (logoDataURL) {
            try {
                // Calculate proper dimensions maintaining aspect ratio (assuming typical logo dimensions)
                const targetHeight = 25;
                const targetWidth = 60; // Estimate or calculate from actual image
                
                // Center the logo image with the company name
                const companyNameWidth = doc.getTextWidth('SUPER SON ENTERPRISE');
                const imageStartX = 15 + (companyNameWidth / 2) - (targetWidth / 2);
                doc.addImage(logoDataURL, 'JPEG', imageStartX, 42, targetWidth, targetHeight);
            } catch (error) {
                console.error('Error adding logo to PDF:', error);
                // Fall back to text if image fails
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text('Quality Products at Best Rates', 15, 45);
            }
        } else {
            // Fallback text if no logo
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Quality Products at Best Rates', 15, 45);
        }
        
        // Invoice title without background
        doc.setTextColor(41, 128, 185); // Blue text only
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', 155, 38);
        
        // Company address in right column - right aligned
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        // Right align the address text
        doc.text('Gandhi Nagar', 190, 48, { align: 'right' });
        doc.text('Aligarh', 190, 53, { align: 'right' });
        doc.text('202001', 190, 58, { align: 'right' });

        // Create aligned section layout - positioned right after logo ends
        const sectionY = 70; // Start right after logo image (42 + 25 + small gap)
        const sectionHeight = 35; // Reduced from 45 to 35
        const headerHeight = 8; // Reduced from 12 to 8
        
        // Bill To section with smaller blue header
        doc.setFillColor(41, 128, 185); // Blue color
        doc.rect(13, sectionY, 120, headerHeight, 'F');
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0); // Black borders
        doc.rect(13, sectionY, 120, sectionHeight); // Full section border
        doc.setTextColor(255, 255, 255); // White text
        doc.setFontSize(10); // Reduced font size
        doc.setFont('helvetica', 'bold');
        doc.text('BILL TO', 15, sectionY + 6); // Adjusted Y position
        
        // Customer details section - centered content
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold'); // Make customer name bold
        // Center the customer name
        const billToWidth = 120;
        const customerNameWidth = doc.getTextWidth(data.customerName);
        const centerX = 13 + (billToWidth / 2) - (customerNameWidth / 2);
        doc.text(data.customerName, centerX, sectionY + 18);
        
        // Address lines in normal font
        doc.setFont('helvetica', 'normal'); // Reset to normal for address
        const addressLines = data.customerAddress.split('\n');
        addressLines.forEach((line, index) => {
            const lineWidth = doc.getTextWidth(line);
            const lineCenterX = 13 + (billToWidth / 2) - (lineWidth / 2);
            doc.text(line, lineCenterX, sectionY + 24 + (index * 4)); // Reduced spacing
        });

        // Right section - same height as BILL TO, with complete outside border
        const rightX = 140;
        const rightWidth = 50;
        const halfWidth = rightWidth / 2;
        
        // Draw entire right section border with proper line width
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.rect(rightX, sectionY, rightWidth, sectionHeight);
        
        // INVOICE # and DATE headers (top part) - consistent font size
        doc.setFillColor(41, 128, 185); // Blue color
        doc.rect(rightX, sectionY, rightWidth, headerHeight, 'F');
        
        // Vertical border to separate INVOICE # and DATE - shorter
        doc.line(rightX + halfWidth, sectionY, rightX + halfWidth, sectionY + 18);
        
        doc.setTextColor(255, 255, 255); // White text
        doc.setFontSize(11); // Match BILL TO font size
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE #', rightX + 2, sectionY + 6);
        doc.text('DATE', rightX + halfWidth + 2, sectionY + 6);
        
        // Invoice values - centered in each half - MADE BOLD
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold'); // Changed from 'normal' to 'bold'
        // Center invoice number in left half
        const invoiceNumWidth = doc.getTextWidth(data.invoiceNumber);
        const invoiceNumCenterX = rightX + (halfWidth / 2) - (invoiceNumWidth / 2);
        doc.text(data.invoiceNumber, invoiceNumCenterX, sectionY + 14);
        
        // Center date in right half - format as DD-MM-YYYY
        const formattedDate = new Date(data.invoiceDate).toLocaleDateString('en-GB');
        const dateWidth = doc.getTextWidth(formattedDate);
        const dateCenterX = rightX + halfWidth + (halfWidth / 2) - (dateWidth / 2);
        doc.text(formattedDate, dateCenterX, sectionY + 14);
        
        // Horizontal line to separate sections - moved up
        doc.line(rightX, sectionY + 18, rightX + rightWidth, sectionY + 18);
        
        // Total Amount To Pay header (middle part) - consistent font size
        doc.setFillColor(41, 128, 185); // Blue color
        doc.rect(rightX, sectionY + 18, rightWidth, headerHeight, 'F');
        doc.setTextColor(255, 255, 255); // White text
        doc.setFontSize(11); // Match BILL TO, INVOICE #, and DATE font size
        doc.setFont('helvetica', 'bold');
        // Center the header text
        const headerText = 'Total Amount To Pay';
        const headerTextWidth = doc.getTextWidth(headerText);
        const headerCenterX = rightX + (rightWidth / 2) - (headerTextWidth / 2);
        doc.text(headerText, headerCenterX, sectionY + 24);
        
        // Total amount value (bottom part) - centered content
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(14); // Consistent with other content
        doc.setFont('helvetica', 'bold');
        const totalText = `${data.total.toFixed(2)}`;
        const totalTextWidth = doc.getTextWidth(totalText);
        const totalCenterX = rightX + (rightWidth / 2) - (totalTextWidth / 2);
        doc.text(totalText, totalCenterX, sectionY + 32);

        // Return the Y position where content can start
        return sectionY + sectionHeight + 8;
    }

    generateTableHeader(doc, yPos) {
        const colWidths = [10, 85, 16, 16, 20, 30];
        const colPositions = [13, 23, 108, 124, 140, 160];
        const headerRowHeight = 12;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        
        // Draw individual header cells with blue background and borders
        colPositions.forEach((pos, index) => {
            doc.setFillColor(41, 128, 185); // Blue color for each cell
            doc.rect(pos, yPos - 5, colWidths[index], headerRowHeight, 'F');
            doc.setLineWidth(0.5);
            doc.setDrawColor(0, 0, 0); // Black border
            doc.rect(pos, yPos - 5, colWidths[index], headerRowHeight);
        });
        
        // Table headers text in white
        doc.setTextColor(255, 255, 255); // White text
        doc.setFontSize(12);
        doc.text('SR', 15, yPos - 1);
        doc.text('NO', 15, yPos + 2);
        doc.text('DESCRIPTION', 60, yPos + 1);
        doc.text('Size', 113, yPos + 1);
        doc.text('QTY', 129, yPos + 1);
        doc.text('PRICE', 145, yPos + 1);
        doc.text('AMOUNT', 170, yPos + 1);
        
        return { colWidths, colPositions, newYPos: yPos + headerRowHeight };
    }

    addRunningSubtotal(doc, pageItems, yPos) {
        // Calculate subtotal for items on this page
        let pageSubtotal = 0;
        pageItems.forEach(item => {
            pageSubtotal += item.amount;
        });

        const totalX = 140; // Align with right section
        const totalWidth = 50;
        
        // SUBTOTAL row with blue left column and white right column
        doc.setFillColor(41, 128, 185); // Blue background
        doc.rect(totalX, yPos + 5, 25, 12, 'F');
        doc.setFillColor(255, 255, 255); // White background
        doc.rect(totalX + 25, yPos + 5, 25, 12, 'F');
        // Borders
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.rect(totalX, yPos + 5, totalWidth, 12);
        doc.line(totalX + 25, yPos + 5, totalX + 25, yPos + 17);
        // Text
        doc.setTextColor(255, 255, 255); // White text for blue column
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('SUBTOTAL', totalX + 3, yPos + 13);
        doc.setTextColor(0, 0, 0); // Black text for white column
        doc.text(`${pageSubtotal.toFixed(0)}`, totalX + 50 - 3, yPos + 13, { align: 'right' });
    }

    addPageNumbering(doc, currentPage, totalPages) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Page ${currentPage} of ${totalPages}`, 190, 285, { align: 'right' });
    }

    addFinalTotals(doc, data, yPos, allPageItems, signatureDataURL = null) {
        // Since we already checked for space when adding old due, we shouldn't need another page break here
        // But let's keep a safety check with a smaller threshold
        let finalPage = false;
        
        if (yPos > 240) { // Reasonable threshold for totals + footer
            // Need new page for final totals
            doc.addPage();
            yPos = 50; // Start near top of page for totals
            finalPage = true;
        }
        
        // Calculate total subtotal from all items
        let totalSubtotal = 0;
        allPageItems.forEach(item => {
            totalSubtotal += item.amount;
        });
        
        const totalX = 140;
        const totalWidth = 50;
        let totalsY = yPos + 5;
        
        // SUBTOTAL row
        doc.setFillColor(41, 128, 185);
        doc.rect(totalX, totalsY, 25, 12, 'F');
        doc.setFillColor(255, 255, 255);
        doc.rect(totalX + 25, totalsY, 25, 12, 'F');
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.rect(totalX, totalsY, totalWidth, 12);
        doc.line(totalX + 25, totalsY, totalX + 25, totalsY + 12);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('SUBTOTAL', totalX + 3, totalsY + 8);
        doc.setTextColor(0, 0, 0);
        doc.text(`${data.subtotal.toFixed(0)}`, totalX + 50 - 3, totalsY + 8, { align: 'right' });
        totalsY += 12;
        
        // Advance row
        doc.setFillColor(41, 128, 185);
        doc.rect(totalX, totalsY, 25, 12, 'F');
        doc.setFillColor(255, 255, 255);
        doc.rect(totalX + 25, totalsY, 25, 12, 'F');
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.rect(totalX, totalsY, totalWidth, 12);
        doc.line(totalX + 25, totalsY, totalX + 25, totalsY + 12);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Advance', totalX + 3, totalsY + 8);
        doc.setTextColor(0, 0, 0);
        doc.text(`${data.advance.toFixed(0)}`, totalX + 50 - 3, totalsY + 8, { align: 'right' });
        totalsY += 12;
        
        // Total row
        doc.setFillColor(41, 128, 185);
        doc.rect(totalX, totalsY, 25, 14, 'F');
        doc.setFillColor(255, 255, 255);
        doc.rect(totalX + 25, totalsY, 25, 14, 'F');
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.rect(totalX, totalsY, totalWidth, 14);
        doc.line(totalX + 25, totalsY, totalX + 25, totalsY + 14);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', totalX + 3, totalsY + 9);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text(`${data.total.toFixed(0)}`, totalX + 50 - 3, totalsY + 9, { align: 'right' });
        
        // Thank you message
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(41, 128, 185);
        doc.text('Thank you for your business!', 105, totalsY + 20, { align: 'center' });
        
        // Add footer only on final page
        this.addFooter(doc, totalsY + 25, signatureDataURL);
        
        return { totalPages: finalPage ? 2 : 1 }; // Return if we created an extra page
    }

    addFooter(doc, yPos, signatureDataURL = null) {
        // Footer logic (signature, contact info)
        yPos += 5;
        
        // Add a separator line above footer
        doc.setLineWidth(0.5);
        doc.setDrawColor(150, 150, 150);
        doc.line(20, yPos, 190, yPos);
        yPos += 5;
        
        // Add signature image above "Authorized" text if available
        if (signatureDataURL) {
            try {
                doc.addImage(signatureDataURL, 'PNG', 20, yPos - 15, 30, 12); // x, y, width, height
            } catch (error) {
                console.error('Error adding signature to PDF:', error);
            }
        }
        
        // Add "Authorized" text
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Authorized', 20, yPos + 20);
        
        // Add contact information
        yPos += 28;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text('If you have any questions about this invoice, please contact', 20, yPos);
        yPos += 4;
        doc.setTextColor(41, 128, 185);
        doc.text('[Mob: 9413121066, email: satyendratie@gmail.com]', 20, yPos);
    }

    async loadImages() {
        const loadImage = (src) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        const dataURL = canvas.toDataURL(src.includes('.png') ? 'image/png' : 'image/jpeg', 0.9);
                        resolve(dataURL);
                    } catch (error) {
                        console.error(`Error converting ${src} to base64:`, error);
                        resolve(null);
                    }
                };
                img.onerror = () => {
                    console.log(`Image ${src} not found`);
                    resolve(null);
                };
                img.src = src;
            });
        };

        const [logoDataURL, signatureDataURL] = await Promise.all([
            loadImage('Our Logo.jpg'),
            loadImage('sign.png')
        ]);

        return { logoDataURL, signatureDataURL };
    }

    async completePDFGenerationAsync(doc, data) {
        // Load images first
        const { logoDataURL, signatureDataURL } = await this.loadImages();
        
        let currentPage = 1;
        let yPos = this.generatePageHeader(doc, data, currentPage, logoDataURL);
        
        // Generate table header for first page
        const tableConfig = this.generateTableHeader(doc, yPos);
        const { colWidths, colPositions } = tableConfig;
        yPos = tableConfig.newYPos;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0); // Black text
        
        // Page break constants
        const pageHeight = 285; // Safe page height (297 - margins)
        const minSpaceForFooter = 50; // Space for running subtotal only
        const minSpaceForFinalTotals = 90; // Space needed for final totals + footer (reduced to be less conservative)
        let pageItems = []; // Track items on current page for subtotal calculation

        // Group items by description
        const groupedItems = {};
        data.items.forEach((item, index) => {
            if (!groupedItems[item.description]) {
                groupedItems[item.description] = [];
            }
            groupedItems[item.description].push({...item, originalIndex: index});
        });

        // Items with individual cell borders - dynamic row height based on description and grouping
        let currentSrNo = 1;
        const groupKeys = Object.keys(groupedItems);
        
        for (let groupIndex = 0; groupIndex < groupKeys.length; groupIndex++) {
            const description = groupKeys[groupIndex];
            const items = groupedItems[description];
            const baseItemHeight = 6;
            const maxDescriptionWidth = colWidths[1] - 4;
            
            // Calculate how many lines the description needs
            doc.setFontSize(14);
            // Split by manual line breaks first, then by width
            const manualLines = description.split('\n');
            let descriptionLines = [];
            manualLines.forEach(line => {
                if (line.trim() === '') {
                    descriptionLines.push(''); // Preserve empty lines
                } else {
                    const wrappedLines = doc.splitTextToSize(line, maxDescriptionWidth);
                    descriptionLines = descriptionLines.concat(wrappedLines);
                }
            });
            
            if (items.length === 1) {
                // Single item - display normally
                const item = items[0];
                const requiredHeight = Math.max(baseItemHeight, descriptionLines.length * 5 + 6);
                
                // Check if item fits on current page
                if (yPos + requiredHeight > pageHeight - minSpaceForFooter) {
                    // Add running subtotal to current page
                    this.addRunningSubtotal(doc, pageItems, yPos);
                    
                    // Start new page
                    doc.addPage();
                    currentPage++;
                    yPos = this.generatePageHeader(doc, data, currentPage, logoDataURL);
                    const newTableConfig = this.generateTableHeader(doc, yPos);
                    yPos = newTableConfig.newYPos;
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);
                    pageItems = []; // Reset page items
                }
                
                // Draw individual cells for the item
                colPositions.forEach((pos, colIndex) => {
                    doc.rect(pos, yPos - 5, colWidths[colIndex], requiredHeight);
                });
                
                // Position text content - properly centered vertically
                const cellCenterY = yPos - 5 + (requiredHeight / 2) + 2;
                doc.setFontSize(14);
                doc.text(currentSrNo.toString(), 15, cellCenterY);
                
                // Handle multi-line description
                if (descriptionLines.length > 1) {
                    const totalDescHeight = descriptionLines.length * 5;
                    const descStartY = cellCenterY - (totalDescHeight / 2) + 2;
                    descriptionLines.forEach((line, lineIndex) => {
                        doc.text(line, 25, descStartY + (lineIndex * 5));
                    });
                } else {
                    doc.text(description, 25, cellCenterY);
                }
                
                // Center text horizontally in each column
                const sizeText = item.size;
                const sizeWidth = doc.getTextWidth(sizeText);
                const sizeCenterX = colPositions[2] + (colWidths[2] / 2) - (sizeWidth / 2);
                doc.text(sizeText, sizeCenterX, cellCenterY);
                
                const qtyText = item.qty.toString();
                const qtyWidth = doc.getTextWidth(qtyText);
                const qtyCenterX = colPositions[3] + (colWidths[3] / 2) - (qtyWidth / 2);
                doc.text(qtyText, qtyCenterX, cellCenterY);
                
                const priceText = item.price.toFixed(0);
                const priceWidth = doc.getTextWidth(priceText);
                const priceCenterX = colPositions[4] + (colWidths[4] / 2) - (priceWidth / 2);
                doc.text(priceText, priceCenterX, cellCenterY);
                
                const amountText = `${item.amount.toFixed(0)}`;
                const amountRightX = colPositions[5] + colWidths[5] - 3; // Right align with 3pt margin
                doc.text(amountText, amountRightX, cellCenterY, { align: 'right' });
                yPos += requiredHeight;
                currentSrNo++;
                
                // Add item to page items for subtotal calculation
                pageItems.push(item);
            } else {
                // Multiple items with same description - group them
                const itemRowHeight = 8; // Height for each size/qty/price/amount row
                const groupRequiredHeight = Math.max(items.length * itemRowHeight, descriptionLines.length * 5 + 8);
                
                // Check if group fits on current page
                if (yPos + groupRequiredHeight > pageHeight - minSpaceForFooter) {
                    // Add running subtotal to current page
                    this.addRunningSubtotal(doc, pageItems, yPos);
                    
                    // Start new page
                    doc.addPage();
                    currentPage++;
                    yPos = this.generatePageHeader(doc, data, currentPage, logoDataURL);
                    const newTableConfig = this.generateTableHeader(doc, yPos);
                    yPos = newTableConfig.newYPos;
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);
                    pageItems = []; // Reset page items
                }
                
                // Draw cells for the entire group
                colPositions.forEach((pos, colIndex) => {
                    doc.rect(pos, yPos - 5, colWidths[colIndex], groupRequiredHeight);
                });
                
                // Add horizontal borders to separate each item row within the group
                for (let i = 1; i < items.length; i++) {
                    const borderY = yPos - 5 + (i * itemRowHeight);
                    // Only draw horizontal lines in size, qty, price, amount columns (skip SR NO and description)
                    for (let colIndex = 2; colIndex < colPositions.length; colIndex++) {
                        doc.line(colPositions[colIndex], borderY, colPositions[colIndex] + colWidths[colIndex], borderY);
                    }
                }
                
                // Position description (first two columns content) - centered vertically
                const groupCenterY = yPos - 5 + (groupRequiredHeight / 2) + 2;
                doc.setFontSize(14);
                doc.text(currentSrNo.toString(), 15, groupCenterY);
                
                // Handle multi-line description in center
                if (descriptionLines.length > 1) {
                    const totalDescHeight = descriptionLines.length * 5;
                    const descStartY = groupCenterY - (totalDescHeight / 2) + 2;
                    descriptionLines.forEach((line, lineIndex) => {
                        doc.text(line, 25, descStartY + (lineIndex * 5));
                    });
                } else {
                    doc.text(description, 25, groupCenterY);
                }
                
                // Display multiple sizes, quantities, prices and amounts - each row vertically centered
                items.forEach((item, itemIndex) => {
                    const rowCenterY = yPos - 5 + (itemIndex * itemRowHeight) + (itemRowHeight / 2) + 2;
                    
                    // Center text horizontally in each column
                    const sizeText = item.size;
                    const sizeWidth = doc.getTextWidth(sizeText);
                    const sizeCenterX = colPositions[2] + (colWidths[2] / 2) - (sizeWidth / 2);
                    doc.text(sizeText, sizeCenterX, rowCenterY);
                    
                    const qtyText = item.qty.toString();
                    const qtyWidth = doc.getTextWidth(qtyText);
                    const qtyCenterX = colPositions[3] + (colWidths[3] / 2) - (qtyWidth / 2);
                    doc.text(qtyText, qtyCenterX, rowCenterY);
                    
                    const priceText = item.price.toFixed(0);
                    const priceWidth = doc.getTextWidth(priceText);
                    const priceCenterX = colPositions[4] + (colWidths[4] / 2) - (priceWidth / 2);
                    doc.text(priceText, priceCenterX, rowCenterY);
                    
                    const amountText = `${item.amount.toFixed(0)}`;
                    const amountRightX = colPositions[5] + colWidths[5] - 3; // Right align with 3pt margin
                    doc.text(amountText, amountRightX, rowCenterY, { align: 'right' });
                });
                
                yPos += groupRequiredHeight;
                currentSrNo++;
                
                // Add all items in the group to page items for subtotal calculation
                pageItems.push(...items);
            }
        }
        
        // Add old due row if present
        if (data.oldDue.hasOldDue && data.oldDue.amount > 0) {
            const oldDueHeight = 10;
            
            // Check if old due row fits on current page (need extra space for final totals)
            if (yPos + oldDueHeight > pageHeight - minSpaceForFinalTotals) {
                // Add running subtotal to current page
                this.addRunningSubtotal(doc, pageItems, yPos);
                
                // Start new page
                doc.addPage();
                currentPage++;
                yPos = this.generatePageHeader(doc, data, currentPage);
                const newTableConfig = this.generateTableHeader(doc, yPos);
                yPos = newTableConfig.newYPos;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                pageItems = []; // Reset page items
            }
            
            // Draw grey background for old due row
            doc.setFillColor(220, 220, 220); // Light grey background
            doc.rect(13, yPos - 5, 177, oldDueHeight, 'F');
            
            // Draw individual cells with borders
            colPositions.forEach((pos, index) => {
                doc.setLineWidth(0.5);
                doc.setDrawColor(0, 0, 0);
                doc.rect(pos, yPos - 5, colWidths[index], oldDueHeight);
            });
            
            const cellCenterY = yPos - 5 + (oldDueHeight / 2) + 2;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            
            // OLD DUE in SR NO column - smaller font to fit better
            doc.setFontSize(10);
            doc.text('OLD', 15, cellCenterY - 1);
            doc.text('DUE', 15, cellCenterY + 2);
            doc.setFontSize(14); // Reset font size
            
            // Format description with bold bill number and date
            let description = '';
            if (data.oldDue.billNumber) {
                description += `Bill No.: ${data.oldDue.billNumber}`;
            }
            if (data.oldDue.date) {
                const formattedOldDate = new Date(data.oldDue.date).toLocaleDateString('en-GB');
                if (description) description += ` dated: ${formattedOldDate}`;
                else description = `Dated: ${formattedOldDate}`;
            }
            if (!description) description = 'Previous Due';
            
            doc.text(description, 25, cellCenterY);
            
            // Empty cells for Size, QTY, Price (centered dashes)
            doc.setFont('helvetica', 'normal');
            const sizeWidth = doc.getTextWidth('-');
            const sizeCenterX = colPositions[2] + (colWidths[2] / 2) - (sizeWidth / 2);
            doc.text('-', sizeCenterX, cellCenterY);
            
            const qtyWidth = doc.getTextWidth('-');
            const qtyCenterX = colPositions[3] + (colWidths[3] / 2) - (qtyWidth / 2);
            doc.text('-', qtyCenterX, cellCenterY);
            
            const priceWidth = doc.getTextWidth('-');
            const priceCenterX = colPositions[4] + (colWidths[4] / 2) - (priceWidth / 2);
            doc.text('-', priceCenterX, cellCenterY);
            
            // Amount (right-aligned, bold)
            doc.setFont('helvetica', 'bold');
            const amountText = `${data.oldDue.amount.toFixed(0)}`;
            const amountRightX = colPositions[5] + colWidths[5] - 3;
            doc.text(amountText, amountRightX, cellCenterY, { align: 'right' });
            
            yPos += oldDueHeight;
            
            // Add old due as an item for subtotal calculation
            pageItems.push({ amount: data.oldDue.amount });
        }
        
        // Add page numbering and final totals
        this.addPageNumbering(doc, currentPage, currentPage); // We'll update total pages later
        
        // Check if we need space for final totals
        const totalPageInfo = this.addFinalTotals(doc, data, yPos, pageItems, signatureDataURL);
        const totalPages = totalPageInfo.totalPages || currentPage;
        
        // Update page numbering on all pages
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            if (pageNum < totalPages) {
                // Go to specific page and update numbering
                doc.setPage(pageNum);
                this.addPageNumbering(doc, pageNum, totalPages);
            }
        }

        // Generate filename and save PDF
        const cleanCustomerName = data.customerName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const firstAddressLine = data.customerAddress.split('\n')[0].replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const filename = `${data.invoiceNumber} ${cleanCustomerName}, ${firstAddressLine}.pdf`;
        doc.save(filename);
    }

    loadInvoicesFromStorage() {
        const saved = localStorage.getItem('invoices');
        return saved ? JSON.parse(saved) : {};
    }

    saveInvoicesToStorage() {
        localStorage.setItem('invoices', JSON.stringify(this.invoices));
    }

    displaySavedInvoices() {
        const container = document.getElementById('savedInvoicesList');
        container.innerHTML = '';

        const invoiceIds = Object.keys(this.invoices);
        if (invoiceIds.length === 0) {
            container.innerHTML = '<p>No saved invoices.</p>';
            return;
        }

        invoiceIds.forEach(id => {
            const invoice = this.invoices[id];
            const div = document.createElement('div');
            div.className = 'saved-invoice-item';
            div.innerHTML = `
                <span>${id} - ${invoice.customerName} (Rs${invoice.total.toFixed(2)})</span>
                <div>
                    <button onclick="generator.loadSavedInvoice('${id}')" class="btn btn-sm">Load</button>
                    <button onclick="generator.deleteSavedInvoice('${id}')" class="btn btn-sm btn-danger">Delete</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    loadSavedInvoice(invoiceId) {
        const data = this.invoices[invoiceId];
        this.populateForm(data);
    }

    deleteSavedInvoice(invoiceId) {
        if (confirm('Are you sure you want to delete this invoice?')) {
            delete this.invoices[invoiceId];
            this.saveInvoicesToStorage();
            this.displaySavedInvoices();
        }
    }
}

// Initialize the application
let generator;
document.addEventListener('DOMContentLoaded', () => {
    generator = new InvoiceGenerator();
});