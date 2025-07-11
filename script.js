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
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('invoiceDate').value = today;
    }

    addItem() {
        this.itemCount++;
        const tableBody = document.getElementById('itemsTableBody');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${this.itemCount}</td>
            <td><input type="text" class="item-description" placeholder="Description" required></td>
            <td><input type="text" class="item-size" placeholder="Size"></td>
            <td><input type="number" class="item-qty" placeholder="Qty" min="1" required></td>
            <td><input type="number" class="item-price" placeholder="Price" step="0.01" min="0" required></td>
            <td class="item-amount">Rs 0</td>
            <td><button type="button" class="btn btn-danger remove-item">Remove</button></td>
        `;
        tableBody.appendChild(row);

        // Add event listeners for calculations
        const qtyInput = row.querySelector('.item-qty');
        const priceInput = row.querySelector('.item-price');
        const removeBtn = row.querySelector('.remove-item');

        qtyInput.addEventListener('input', () => this.calculateItemAmount(row));
        priceInput.addEventListener('input', () => this.calculateItemAmount(row));
        removeBtn.addEventListener('click', () => this.removeItem(row));
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
        row.querySelector('.item-amount').textContent = `Rs ${amount.toFixed(2)}`;
        this.calculateTotal();
    }

    calculateTotal() {
        const amounts = document.querySelectorAll('.item-amount');
        let subtotal = 0;
        amounts.forEach(amount => {
            const value = parseFloat(amount.textContent.replace('Rs ', '')) || 0;
            subtotal += value;
        });
        
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
            const amount = row.querySelector('.item-amount').textContent.replace('Rs ', '');
            
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
            total: parseFloat(document.getElementById('total').value) || 0
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
            row.querySelector('.item-description').value = item.description;
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
                this.completePDFGeneration(doc, data);
            } catch (error) {
                console.error('Error converting image to base64:', error);
                // Fall back to text if image conversion fails
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text('Quality Products at Best Rates', 15, 45);
                this.completePDFGeneration(doc, data);
            }
        };
        img.onerror = () => {
            // If image fails to load, show text as fallback
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Quality Products at Best Rates', 15, 45);
            this.completePDFGeneration(doc, data);
        };
        img.src = 'Our Logo.jpg';
        
        // Return early since PDF generation will complete asynchronously
        return;
    }

    completePDFGeneration(doc, data) {
        
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
        doc.setFontSize(9);
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
        doc.setFontSize(10); // Match BILL TO font size
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE #', rightX + 2, sectionY + 6);
        doc.text('DATE', rightX + halfWidth + 2, sectionY + 6);
        
        // Invoice values - centered in each half
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        // Center invoice number in left half
        const invoiceNumWidth = doc.getTextWidth(data.invoiceNumber);
        const invoiceNumCenterX = rightX + (halfWidth / 2) - (invoiceNumWidth / 2);
        doc.text(data.invoiceNumber, invoiceNumCenterX, sectionY + 14);
        
        // Center date in right half
        const dateWidth = doc.getTextWidth(data.invoiceDate);
        const dateCenterX = rightX + halfWidth + (halfWidth / 2) - (dateWidth / 2);
        doc.text(data.invoiceDate, dateCenterX, sectionY + 14);
        
        // Horizontal line to separate sections - moved up
        doc.line(rightX, sectionY + 18, rightX + rightWidth, sectionY + 18);
        
        // Total Amount To Pay header (middle part) - consistent font size
        doc.setFillColor(41, 128, 185); // Blue color
        doc.rect(rightX, sectionY + 18, rightWidth, headerHeight, 'F');
        doc.setTextColor(255, 255, 255); // White text
        doc.setFontSize(8); // Fit in the space
        doc.setFont('helvetica', 'bold');
        // Center the header text
        const headerText = 'Total Amount To Pay';
        const headerTextWidth = doc.getTextWidth(headerText);
        const headerCenterX = rightX + (rightWidth / 2) - (headerTextWidth / 2);
        doc.text(headerText, headerCenterX, sectionY + 24);
        
        // Total amount value (bottom part) - centered content
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(9); // Consistent with other content
        doc.setFont('helvetica', 'bold');
        const totalText = `Rs ${data.total.toFixed(2)}`;
        const totalTextWidth = doc.getTextWidth(totalText);
        const totalCenterX = rightX + (rightWidth / 2) - (totalTextWidth / 2);
        doc.text(totalText, totalCenterX, sectionY + 32);

        // Items table with blue headers - aligned with sections above
        let yPos = sectionY + sectionHeight + 8; // Start right after sections with minimal gap
        const tableWidth = 177; // Match total width of sections above (13 to 190)
        const tableStartX = 13;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        
        // Define column widths and positions - aligned with sections above
        const colWidths = [15, 62, 20, 20, 25, 35]; // Increased description width to match total
        const colPositions = [13, 28, 90, 110, 130, 155];
        
        // Draw individual header cells with blue background and borders - reduced height
        const headerRowHeight = 12; // Reduced from 15 to 12
        colPositions.forEach((pos, index) => {
            doc.setFillColor(41, 128, 185); // Blue color for each cell
            doc.rect(pos, yPos - 5, colWidths[index], headerRowHeight, 'F');
            doc.setLineWidth(0.5);
            doc.setDrawColor(0, 0, 0); // Black border
            doc.rect(pos, yPos - 5, colWidths[index], headerRowHeight);
        });
        
        // Table headers text in white - adjusted positioning for smaller height
        doc.setTextColor(255, 255, 255); // White text
        doc.setFontSize(8); // Reduced font size
        doc.text('SR', 17, yPos - 1);
        doc.text('NO', 17, yPos + 2);
        doc.text('DESCRIPTION', 50, yPos + 1);
        doc.text('Size', 95, yPos + 1);
        doc.text('QTY', 117, yPos + 1);
        doc.text('PRICE', 137, yPos + 1);
        doc.text('AMOUNT', 164, yPos + 1);
        
        yPos += headerRowHeight;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0); // Black text

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
        Object.keys(groupedItems).forEach(description => {
            const items = groupedItems[description];
            const baseItemHeight = 8;
            const maxDescriptionWidth = colWidths[1] - 4;
            
            // Calculate how many lines the description needs
            doc.setFontSize(8);
            const descriptionLines = doc.splitTextToSize(description, maxDescriptionWidth);
            
            if (items.length === 1) {
                // Single item - display normally
                const item = items[0];
                const requiredHeight = Math.max(baseItemHeight, descriptionLines.length * 3 + 3);
                
                // Draw individual cells for the item
                colPositions.forEach((pos, colIndex) => {
                    doc.rect(pos, yPos - 5, colWidths[colIndex], requiredHeight);
                });
                
                // Position text content - properly centered vertically
                const cellCenterY = yPos - 5 + (requiredHeight / 2);
                doc.setFontSize(8);
                doc.text(currentSrNo.toString(), 17, cellCenterY);
                
                // Handle multi-line description
                if (descriptionLines.length > 1) {
                    const totalDescHeight = descriptionLines.length * 3;
                    const descStartY = cellCenterY - (totalDescHeight / 2) + 1;
                    descriptionLines.forEach((line, lineIndex) => {
                        doc.text(line, 30, descStartY + (lineIndex * 3));
                    });
                } else {
                    doc.text(description, 30, cellCenterY);
                }
                
                doc.text(item.size, 92, cellCenterY);
                doc.text(item.qty.toString(), 117, cellCenterY);
                doc.text(item.price.toFixed(0), 137, cellCenterY);
                doc.text(`Rs ${item.amount.toFixed(0)}`, 160, cellCenterY);
                yPos += requiredHeight;
                currentSrNo++;
            } else {
                // Multiple items with same description - group them
                const itemRowHeight = 8; // Height for each size/qty/price/amount row
                const groupRequiredHeight = Math.max(items.length * itemRowHeight, descriptionLines.length * 3 + 6);
                
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
                const groupCenterY = yPos - 5 + (groupRequiredHeight / 2);
                doc.setFontSize(8);
                doc.text(currentSrNo.toString(), 17, groupCenterY);
                
                // Handle multi-line description in center
                if (descriptionLines.length > 1) {
                    const totalDescHeight = descriptionLines.length * 3;
                    const descStartY = groupCenterY - (totalDescHeight / 2) + 1;
                    descriptionLines.forEach((line, lineIndex) => {
                        doc.text(line, 30, descStartY + (lineIndex * 3));
                    });
                } else {
                    doc.text(description, 30, groupCenterY);
                }
                
                // Display multiple sizes, quantities, prices and amounts - each row vertically centered
                items.forEach((item, itemIndex) => {
                    const rowCenterY = yPos - 5 + (itemIndex * itemRowHeight) + (itemRowHeight / 2);
                    doc.text(item.size, 92, rowCenterY);
                    doc.text(item.qty.toString(), 117, rowCenterY);
                    doc.text(item.price.toFixed(0), 137, rowCenterY);
                    doc.text(`Rs ${item.amount.toFixed(0)}`, 160, rowCenterY);
                });
                
                yPos += groupRequiredHeight;
                currentSrNo++;
            }
        });
        
        // Store final items table position for connecting totals
        const itemsEndY = yPos;

        // Enhanced totals table - connected directly to items table
        const totalsStartY = itemsEndY + 5;
        const totalWidth = 80; // Increased width for better proportions
        const totalX = 110; // Adjusted to align better with items table
        
        let totalsY = totalsStartY;
        
        // Professional SUBTOTAL row matching invoice color scheme
        doc.setFillColor(250, 250, 250); // Light gray background
        doc.rect(totalX, totalsY, totalWidth, 12, 'F');
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0); // Black border
        doc.rect(totalX, totalsY, totalWidth, 12);
        doc.line(totalX + 50, totalsY, totalX + 50, totalsY + 12);
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('SUBTOTAL', totalX + 3, totalsY + 8);
        doc.setFont('helvetica', 'bold');
        doc.text(`Rs ${data.subtotal.toFixed(0)}`, totalX + 53, totalsY + 8);
        totalsY += 12;
        
        // Professional Advance row
        doc.setFillColor(250, 250, 250); // Light gray background
        doc.rect(totalX, totalsY, totalWidth, 12, 'F');
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0); // Black border
        doc.rect(totalX, totalsY, totalWidth, 12);
        doc.line(totalX + 50, totalsY, totalX + 50, totalsY + 12);
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Advance', totalX + 3, totalsY + 8);
        doc.setFont('helvetica', 'bold');
        doc.text(`Rs ${data.advance.toFixed(0)}`, totalX + 53, totalsY + 8);
        totalsY += 12;
        
        // Professional Total row with blue header matching invoice theme
        doc.setFillColor(41, 128, 185); // Blue background matching invoice headers
        doc.rect(totalX, totalsY, totalWidth, 14, 'F');
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0); // Black border
        doc.rect(totalX, totalsY, totalWidth, 14);
        doc.line(totalX + 50, totalsY, totalX + 50, totalsY + 14);
        doc.setTextColor(255, 255, 255); // White text
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', totalX + 3, totalsY + 9);
        doc.text(`Rs ${data.total.toFixed(0)}`, totalX + 53, totalsY + 9);
        
        // Thank you message - positioned below totals table
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(41, 128, 185); // Blue color
        doc.text('Thank you for your business!', 105, totalsY + 20, { align: 'center' });
        
        // Update yPos for footer
        yPos = totalsY + 25;

        // Footer section with subtle styling - more compact
        yPos += 10;
        
        // Add a separator line above footer
        doc.setLineWidth(0.5);
        doc.setDrawColor(150, 150, 150);
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Authorized', 20, yPos);
        
        yPos += 15;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80); // Slightly gray text
        doc.text('If you have any questions about this invoice, please contact', 20, yPos);
        yPos += 5;
        doc.setTextColor(41, 128, 185); // Blue color for contact info
        doc.text('[Mob: 9413121066, email: satyendratie@gmail.com]', 20, yPos);

        doc.save(`Invoice_${data.invoiceNumber}.pdf`);
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