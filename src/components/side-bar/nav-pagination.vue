<template>
    <div class="sb-nav-pagination" v-if="totalRows > 10">
        <b-pagination size="sm"
                      v-bind:value="value"
                      :total-rows="totalRows"
                      :per-page="10"
                      first-number
                      last-number
                      align="left"
                      v-on:input="$emit('input', $event)"
        />
    </div>
</template>
<script lang="ts">
    import {BPagination} from 'bootstrap-vue';

    export default {
        name: 'nav-pagination',
        props: {
            value: {},
            totalRows: {}
        },
        components:{BPagination}
    };
</script>

<style scoped>
    .sb-nav-pagination {
        margin-top: 1px;
        margin-left: 20px;
    }
</style>
