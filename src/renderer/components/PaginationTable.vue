<template>
  <div>
    <el-table
      :data="pagedData"
      stripe
      size="small"
      border
      min-height="300"
    >
      <slot name="default" />
    </el-table>

    <el-pagination
      v-if="dataAfterFilter.length > pageSize"
      class="pagenation-table-page-container"
      :total="dataAfterFilter.length"
      :page-size="pageSize"
      :current-page="pageIndex"
      layout="total, prev, pager, next"
      background
      @current-change="pageIndex = $event"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';

const props = defineProps({
  data: Array,
  filterKey: String,
  filterValue: String,
});

const pageSize = ref(100);
const pageIndex = ref(1);

const dataAfterFilter = computed(() => {
  const { filterKey } = props;
  const { filterValue } = props;

  nextTick(() => {
    pageIndex.value = 1;
  });

  if (!filterValue || !filterKey) {
    return props.data;
  }

  return props.data.filter(line => line[filterKey].toLowerCase().includes(filterValue.toLowerCase()));
});

const pagedData = computed(() => {
  const start = (pageIndex.value - 1) * pageSize.value;
  return dataAfterFilter.value.slice(start, start + pageSize.value);
});
</script>

<style type="text/css">
  .pagenation-table-page-container {
    margin-top: 20px;
  }
</style>
