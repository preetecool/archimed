<template>
    <div class="empty-session-details">
        <div class="empty-state-message">
            <h3>No session selected</h3>
            <p>Select a session from the list to view details or start recording</p>
        </div>
    </div>
</template>

<style scoped>
.empty-session-details {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px;
}

.empty-state-message {
    text-align: center;
    color: #94a3b8;
    margin-bottom: 10px;
}

.empty-state-message h3 {
    margin: 0 0 8px 0;
    color: #64748b;
    font-size: 16px;
    font-weight: 500;
}

.empty-state-message p {
    margin: 0;
    font-size: 14px;
}

.empty-section {
    background-color: #f8fafc;
    border-radius: 8px;
    padding: 16px;
    border: 1px solid #e2e8f0;
}

.section-title {
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
    margin: 0 0 12px 0;
}

.empty-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.text-placeholder {
    height: 12px;
    background-color: #e2e8f0;
    border-radius: 4px;
    width: 100%;
}

.text-placeholder.short {
    width: 70%;
}

.section-placeholder {
    height: 16px;
    background-color: #cbd5e1;
    border-radius: 4px;
    width: 40%;
    margin-bottom: 8px;
}

.mt-4 {
    margin-top: 16px;
}

.medical-note-section {
    background-color: #f0f7ff;
    border-color: #dbeafe;
}
</style>
